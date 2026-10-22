import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import { db } from '../db';
import { analyzeRepository } from '../analyzer';
import { runPlaywrightVerification } from '../testing/playwright-engine';
import { diagnoseFailure } from '../ai/diagnoser';
import { VerificationRun, RunStatus } from '../types';
import {
  detectFramework,
  detectPackageManager,
  resolveSpawnConfig,
} from './framework-resolver';
import { allocatePort } from './port-allocator';
import { awaitServerReadiness } from './readiness-probe';
import { globalProcessWatchdog } from './process-watchdog';

// Map of active execution runs and their child processes
const activeProcesses = new Map<string, ChildProcess>();
const runListeners = new Map<string, ((event: any) => void)[]>();

export function subscribeToRun(runId: string, listener: (event: any) => void) {
  if (!runListeners.has(runId)) {
    runListeners.set(runId, []);
  }
  runListeners.get(runId)!.push(listener);

  return () => {
    const list = runListeners.get(runId);
    if (list) {
      runListeners.set(
        runId,
        list.filter((l) => l !== listener)
      );
    }
  };
}

function broadcastRunEvent(runId: string, event: any) {
  const listeners = runListeners.get(runId);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {}
    }
  }
}

export async function cancelExecutionRun(runId: string): Promise<boolean> {
  await globalProcessWatchdog.terminateTree(runId);
  activeProcesses.delete(runId);

  const run = await db.getRunById(runId);
  if (run && (run.status === 'starting' || run.status === 'testing' || run.status === 'pending')) {
    await db.updateRun(runId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      errorSummary: 'Run was manually cancelled by the user.',
    });
    broadcastRunEvent(runId, { type: 'status', status: 'cancelled' });
    return true;
  }
  return false;
}

export async function executeVerificationRun(runId: string): Promise<void> {
  const run = await db.getRunById(runId);
  if (!run) return;

  const project = await db.getProjectById(run.projectId);
  if (!project) return;

  const logs: string[] = [];
  const log = async (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[PROOFix ${time}] ${msg}`;
    logs.push(entry);
    await db.updateRun(runId, { logs: [...logs] });
    broadcastRunEvent(runId, { type: 'log', message: entry });
  };

  const setStatus = async (status: RunStatus) => {
    await db.updateRun(runId, { status });
    broadcastRunEvent(runId, { type: 'status', status });
  };

  let targetDir = project.localPath
    ? path.resolve(process.cwd(), project.localPath)
    : process.cwd();

  const assignedPort = project.config.port || 4173;
  const timeoutMs = (project.config.timeoutSecs || 45) * 1000;

  try {
    // -------------------------------------------------------------
    // Stage 1: Importing Source
    // -------------------------------------------------------------
    await setStatus('importing');
    await log(`Importing source for project "${project.name}" (${project.repoProvider})...`);
    await log(`Resolved local target workspace: ${targetDir}`);

    // -------------------------------------------------------------
    // Stage 2: Inspecting Repository
    // -------------------------------------------------------------
    await setStatus('analyzing');
    await log('Inspecting project structure, dependencies, and route manifests...');
    const analysis = await analyzeRepository(targetDir);
    await log(`Detected Framework: ${analysis.framework} | Runtime: ${analysis.runtime}`);
    await log(`Discovered ${analysis.routes.length} route(s): ${analysis.routes.map((r) => r.path).join(', ')}`);

    // -------------------------------------------------------------
    // Stage 3: Preparing Environment & Isolation Policy
    // -------------------------------------------------------------
    await setStatus('preparing');
    await log('Preparing execution environment...');

    const preferredPort = project.config.port || 4173;
    const portAlloc = await allocatePort(preferredPort);
    const assignedPort = portAlloc.allocatedPort;

    if (portAlloc.reassigned) {
      await log(`Port ${preferredPort} was occupied. Reassigned to available port ${assignedPort}.`);
    } else {
      await log(`Assigned port: ${assignedPort} | Execution timeout: ${timeoutMs / 1000}s`);
    }
    await log('Security Policy: Unprivileged process context, environmental secret sanitization, restricted child process tree.');

    // -------------------------------------------------------------
    // Stage 4: Starting Application Server
    // -------------------------------------------------------------
    await setStatus('starting');
    await log(`Starting application server on port ${assignedPort}...`);

    let serverProcess: ChildProcess | null = null;
    let isServerReady = false;

    // Detect framework & resolve exact launcher parameters
    const framework = detectFramework(targetDir);
    const packageManager = detectPackageManager(targetDir);
    const spawnConfig = resolveSpawnConfig({
      workspaceDir: targetDir,
      framework,
      packageManager,
      customStartupCommand: project.config.startupCommand,
      customBuildCommand: project.config.buildCommand,
      customInstallCommand: project.config.installCommand,
      targetPort: assignedPort,
      readinessPath: project.config.readinessPath || '/',
      readinessTimeoutMs: Math.min(timeoutMs, 30000),
      maxRetries: project.config.maxRetries || 2,
    });

    // Check if port is already active
    const alreadyActive = await checkPortReadiness('localhost', assignedPort, 1000);

    if (alreadyActive) {
      await log(`Existing server detected active on port ${assignedPort}. Attaching for verification...`);
      isServerReady = true;
    } else {
      await log(`Launching runtime (${spawnConfig.framework}): ${spawnConfig.executable} ${spawnConfig.args.join(' ')}`);
      const child = spawn(
        spawnConfig.executable,
        spawnConfig.args,
        {
          cwd: spawnConfig.cwd,
          env: spawnConfig.env as NodeJS.ProcessEnv,
          shell: spawnConfig.shell,
        }
      );
      serverProcess = child;

      activeProcesses.set(runId, child);
      globalProcessWatchdog.register(
        runId,
        child,
        spawnConfig.framework,
        assignedPort,
        `${spawnConfig.executable} ${spawnConfig.args.join(' ')}`,
        timeoutMs
      );

      child.stdout?.on('data', (d) => {
        const str = d.toString().trim();
        if (str) log(`[App Stdout] ${str}`);
      });

      child.stderr?.on('data', (d) => {
        const str = d.toString().trim();
        if (str) log(`[App Stderr] ${str}`);
      });


      // Poll readiness probe using adaptive readiness probe
      await log(`Awaiting readiness probe at http://localhost:${assignedPort}${spawnConfig.readinessPath}...`);
      const probeResult = await awaitServerReadiness({
        host: 'localhost',
        port: assignedPort,
        path: spawnConfig.readinessPath,
        timeoutMs: Math.min(timeoutMs, 30000),
        pollIntervalMs: 800,
      });

      isServerReady = probeResult.ready;
    }

    if (!isServerReady) {
      await log(`Server readiness check timed out on port ${assignedPort}.`);
      await db.updateRun(runId, {
        status: 'failed',
        startupStatus: 'failed',
        completedAt: new Date().toISOString(),
        errorSummary: `Application failed to respond on port ${assignedPort} within readiness timeout.`,
      });
      await setStatus('failed');
      cleanupServer(runId, serverProcess);
      return;
    }

    await log(`Application server verified READY at http://localhost:${assignedPort}/.`);
    await db.updateRun(runId, { startupStatus: 'success', buildStatus: 'success' });

    // -------------------------------------------------------------
    // Stage 5: Executing Browser Tests with Playwright
    // -------------------------------------------------------------
    await setStatus('testing');
    await log('Launching Playwright Chromium browser tests...');

    const testResults = await runPlaywrightVerification({
      runId,
      baseUrl: `http://localhost:${assignedPort}`,
      routes: analysis.routes,
      timeoutMs: 30000,
      onLog: (msg) => log(msg),
    });

    await db.saveTestResults(testResults);
    await log(`Completed ${testResults.length} Playwright verification checks.`);

    // -------------------------------------------------------------
    // Stage 6: AI-Assisted Evidence Diagnosis
    // -------------------------------------------------------------
    await setStatus('analyzing_ai');
    await log('Analyzing failure evidence and formulating repair hypotheses...');

    const failedTests = testResults.filter((t) => t.status === 'failed');
    const settings = await db.getSettings();

    for (const failedTest of failedTests) {
      await log(`Diagnosing failure: "${failedTest.name}"...`);
      const finding = await diagnoseFailure({
        runId,
        testResult: failedTest,
        projectStack: analysis.framework,
        settings,
      });
      await db.saveFindings([finding]);
      await log(`Generated finding: "${finding.title}" (Confidence: ${finding.confidenceScore}%)`);
    }

    // -------------------------------------------------------------
    // Stage 7: Finalizing Run & Reporting
    // -------------------------------------------------------------
    const passed = testResults.filter((t) => t.status === 'passed').length;
    const failed = testResults.filter((t) => t.status === 'failed').length;
    const blocked = testResults.filter((t) => t.status === 'blocked').length;
    const skipped = testResults.filter((t) => t.status === 'skipped').length;
    const inconclusive = testResults.filter((t) => t.status === 'inconclusive').length;

    await db.updateRun(runId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(run.startedAt).getTime(),
      summary: {
        total: testResults.length,
        passed,
        failed,
        blocked,
        skipped,
        inconclusive,
      },
      errorSummary:
        failed > 0
          ? `${failed} check(s) failed. Evidence and fix recommendations generated.`
          : undefined,
    });

    await log(`Verification completed: ${passed} Passed, ${failed} Failed, ${inconclusive} Inconclusive.`);
    await setStatus('completed');

    cleanupServer(runId, serverProcess);
  } catch (err: any) {
    await log(`Verification run failed with unhandled exception: ${err.message}`);
    await db.updateRun(runId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorSummary: err.message,
    });
    await setStatus('failed');
  }
}

function checkPortReadiness(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host,
        port,
        path: '/',
        timeout: timeoutMs,
      },
      (res) => {
        resolve(res.statusCode !== undefined);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function cleanupServer(runId: string, proc: ChildProcess | null) {
  await globalProcessWatchdog.terminateTree(runId);
  activeProcesses.delete(runId);
}

