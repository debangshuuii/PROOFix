/**
 * Secure Command Runner with Privilege Dropping (Contribution 157)
 *
 * Safely spawns and executes isolated commands with:
 * - Privilege dropping to non-root UID/GID (10001)
 * - Environment sanitization (scrubbing host AWS/Cloud credentials, tokens, SSH keys)
 * - Strict stdout/stderr size capping (preventing log buffer bomb / memory exhaustion)
 * - Integration with SandboxWatchdog for OOM & timeout kills
 * - Comprehensive execution auditing and resource metrics
 */

import { spawn } from 'child_process';
import type {
  SandboxSecurityPolicy,
  SandboxExecutionResult,
  SandboxMetrics,
} from '../types/sandbox-isolation.ts';
import { SandboxWatchdog } from './sandbox-watchdog.ts';

export const DANGEROUS_ENV_VARS = new Set([
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'SSH_AUTH_SOCK',
  'KUBECONFIG',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'DATABASE_URL',
]);

export interface SecureRunnerOptions {
  sandboxId: string;
  command: string;
  args?: string[];
  cwd: string;
  policy: SandboxSecurityPolicy;
  customEnv?: Record<string, string>;
  maxLogSizeBytes?: number;
}

export class SecureCommandRunner {
  private watchdog: SandboxWatchdog;

  constructor(watchdog?: SandboxWatchdog) {
    this.watchdog = watchdog || new SandboxWatchdog();
  }

  /**
   * Cleanses the environment variables passed to the sandboxed process.
   */
  public sanitizeEnvironment(
    rawEnv: NodeJS.ProcessEnv,
    customEnv: Record<string, string> = {}
  ): Record<string, string> {
    const clean: Record<string, string> = {};

    // Standard safe defaults
    clean['PATH'] = rawEnv['PATH'] || '/usr/local/bin:/usr/bin:/bin';
    clean['NODE_ENV'] = 'test';
    clean['PROOF_SANDBOX'] = 'true';
    clean['HOME'] = '/tmp';
    clean['USER'] = 'proofix';

    // Copy non-sensitive variables
    for (const [key, value] of Object.entries(rawEnv)) {
      if (!value) continue;
      const upper = key.toUpperCase();
      if (!DANGEROUS_ENV_VARS.has(upper) && !upper.includes('SECRET') && !upper.includes('KEY')) {
        clean[key] = value;
      }
    }

    // Merge explicitly provided custom environment
    for (const [key, value] of Object.entries(customEnv)) {
      clean[key] = value;
    }

    return clean;
  }

  /**
   * Executes a command within the sandboxed environment with privilege-dropping.
   */
  public async execute(options: SecureRunnerOptions): Promise<SandboxExecutionResult> {
    const {
      sandboxId,
      command,
      args = [],
      cwd,
      policy,
      customEnv = {},
      maxLogSizeBytes = 5 * 1024 * 1024, // 5MB max output buffer
    } = options;

    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let killedByOom = false;
    let killedByTimeout = false;
    let killedByWatchdog = false;

    const env = this.sanitizeEnvironment(process.env, customEnv);

    return new Promise<SandboxExecutionResult>((resolve) => {
      // Configure spawn options
      // On POSIX systems, uid/gid can be set directly if running as root or capable
      const spawnOpts: Parameters<typeof spawn>[2] = {
        cwd,
        env: env as unknown as NodeJS.ProcessEnv,
        shell: false,
      };

      if (process.platform !== 'win32' && process.getuid && process.getuid() === 0) {
        spawnOpts.uid = policy.capabilities.runAsUserUid || 10001;
        spawnOpts.gid = policy.capabilities.runAsUserGid || 10001;
      }

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(command, args, spawnOpts);
      } catch (err) {
        const durationMs = Date.now() - startTime;
        return resolve({
          sandboxId,
          exitCode: 1,
          stdout: '',
          stderr: `Failed to spawn sandboxed command: ${(err as Error).message}`,
          durationMs,
          metrics: {
            currentMemoryUsageMb: 0,
            peakMemoryUsageMb: 0,
            cpuPercentage: 0,
            activeProcessCount: 0,
            ioReadBytes: 0,
            ioWriteBytes: 0,
            egressPacketsBlocked: 0,
          },
          killedByOom: false,
          killedByTimeout: false,
          isolationMode: policy.isolationMode,
          terminatedCleanly: false,
        });
      }

      // Start watchdog monitoring
      const session = this.watchdog.startWatchdog(sandboxId, policy.quotas, child.pid, (reason) => {
        killedByWatchdog = true;
        if (reason === 'oom_kill') killedByOom = true;
        if (reason === 'execution_timeout') killedByTimeout = true;

        try {
          if (process.platform === 'win32') {
            child.kill();
          } else {
            child.kill('SIGTERM');
            setTimeout(() => {
              try { child.kill('SIGKILL'); } catch { /* ignore */ }
            }, 1000);
          }
        } catch {
          // Process already ended
        }
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        if (stdoutBuffer.length < maxLogSizeBytes) {
          const remaining = maxLogSizeBytes - stdoutBuffer.length;
          const text = chunk.toString();
          stdoutBuffer += text.slice(0, remaining);
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderrBuffer.length < maxLogSizeBytes) {
          const remaining = maxLogSizeBytes - stderrBuffer.length;
          const text = chunk.toString();
          stderrBuffer += text.slice(0, remaining);
        }
      });

      child.on('close', (code) => {
        this.watchdog.stopWatchdog(sandboxId);
        const durationMs = Date.now() - startTime;
        const metrics: SandboxMetrics = session.currentMetrics;

        resolve({
          sandboxId,
          exitCode: code ?? (killedByWatchdog ? 137 : 1),
          stdout: stdoutBuffer,
          stderr: stderrBuffer,
          durationMs,
          metrics,
          killedByOom,
          killedByTimeout,
          isolationMode: policy.isolationMode,
          terminatedCleanly: !killedByWatchdog && code === 0,
        });
      });

      child.on('error', (err) => {
        this.watchdog.stopWatchdog(sandboxId);
        const durationMs = Date.now() - startTime;
        resolve({
          sandboxId,
          exitCode: 1,
          stdout: stdoutBuffer,
          stderr: stderrBuffer + `\nProcess error: ${err.message}`,
          durationMs,
          metrics: session.currentMetrics,
          killedByOom,
          killedByTimeout,
          isolationMode: policy.isolationMode,
          terminatedCleanly: false,
        });
      });
    });
  }
}
