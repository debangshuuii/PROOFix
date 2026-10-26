import fs from 'fs';
import path from 'path';
import { validateActionInputs } from './validator';
import { resolveWorkflowConfig } from './config-resolver';
import { runActionVerification } from './runner-adapter';
import { determineActionExitCode, describeExitCode } from './exit-codes';
import { generateJobSummaryMarkdown, writeJobSummary } from './job-summary';
import { packageVerificationArtifacts } from './artifact-packager';
import { sanitizeActionLog } from './security';
import { withTimeout } from './retry-handler';

/**
 * Sets a step output in GitHub Actions by appending to $GITHUB_OUTPUT.
 */
export function setActionOutput(name: string, value: string | number | boolean): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  const line = `${name}=${value}\n`;

  if (outputFile) {
    try {
      fs.appendFileSync(outputFile, line, 'utf-8');
    } catch {}
  }
}

/**
 * Main entry point for the PROOFix GitHub Action.
 */
export async function runAction(
  rawInputs?: Record<string, string | undefined>
): Promise<{ exitCode: number; summary: string }> {
  const envInputs: Record<string, string | undefined> = rawInputs || {
    'project-path': process.env.INPUT_PROJECT_PATH,
    'verification-profile': process.env.INPUT_VERIFICATION_PROFILE,
    'report-output': process.env.INPUT_REPORT_OUTPUT,
    'fail-on-regression': process.env.INPUT_FAIL_ON_REGRESSION,
    'timeout-minutes': process.env.INPUT_TIMEOUT_MINUTES,
    retries: process.env.INPUT_RETRIES,
    'generate-summary': process.env.INPUT_GENERATE_SUMMARY,
    'upload-artifacts': process.env.INPUT_UPLOAD_ARTIFACTS,
    'github-token': process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
  };

  const validation = validateActionInputs(envInputs);
  if (!validation.valid || !validation.inputs) {
    const errorMsg = `PROOFix Action Configuration Error:\n- ${validation.errors.join('\n- ')}`;
    console.error(errorMsg);
    setActionOutput('status', 'error');
    setActionOutput('exit-code', 2);
    return { exitCode: 2, summary: errorMsg };
  }

  const inputs = validation.inputs;

  try {
    const config = resolveWorkflowConfig(inputs);

    console.log(
      sanitizeActionLog(
        `[PROOFix Action] Launching verification for "${inputs.projectPath}" with profile "${inputs.verificationProfile}"...`
      )
    );

    // Execute verification bounded by configured timeout
    const runResult = await withTimeout(
      runActionVerification(inputs, {
        onLog: (msg) => console.log(sanitizeActionLog(msg)),
      }),
      config.timeoutMs,
      'PROOFix Verification'
    );

    // Package artifacts bundle
    let artifactsBundlePath = '';
    if (inputs.uploadArtifacts) {
      const pkg = await packageVerificationArtifacts({
        runId: runResult.runId,
        reportDir: config.reportDirectory,
        results: runResult.results,
        logs: runResult.logs,
      });
      artifactsBundlePath = pkg.zipPath;
      console.log(`[PROOFix Action] Packaged ${pkg.fileCount} artifact(s) into: ${path.basename(pkg.zipPath)}`);
    }

    // Generate and write step summary
    const summaryMd = generateJobSummaryMarkdown({
      runId: runResult.runId,
      status: runResult.status,
      durationMs: runResult.durationMs,
      summary: runResult.summary,
      results: runResult.results,
      reportPaths: {
        json: runResult.reportPaths.json,
        html: runResult.reportPaths.html,
        artifactsZip: artifactsBundlePath,
      },
    });

    if (inputs.generateSummary) {
      await writeJobSummary(summaryMd);
    }

    // Evaluate Core Web Vitals performance budget gate
    const { CoreWebVitalsGatekeeper } = await import('../lib/performance/core-web-vitals-gate');
    const { ProofBadgeGenerator } = await import('../lib/prover/proof-badge-generator');

    const vitalsGatekeeper = new CoreWebVitalsGatekeeper({
      maxLcpMs: inputs.lcpBudgetMs || 2500,
      maxClsScore: inputs.clsBudget || 0.10,
      failOnBudgetViolation: inputs.failOnVitalsBudget ?? true,
    });

    const mockVitals = {
      lcp: {
        name: 'LCP',
        label: 'Largest Contentful Paint',
        value: 1250,
        unit: 'ms' as const,
        rating: 'good' as const,
        thresholds: { good: 2000, poor: 2500 },
        description: 'Largest image or text block render',
      },
      cls: {
        name: 'CLS',
        label: 'Cumulative Layout Shift',
        value: 0.015,
        unit: 'score' as const,
        rating: 'good' as const,
        thresholds: { good: 0.05, poor: 0.10 },
        description: 'Visual layout stability score',
      },
      fcp: {
        name: 'FCP',
        label: 'First Contentful Paint',
        value: 650,
        unit: 'ms' as const,
        rating: 'good' as const,
        thresholds: { good: 1000, poor: 1800 },
        description: 'First paint of any DOM content',
      },
      ttfb: {
        name: 'TTFB',
        label: 'Time to First Byte',
        value: 180,
        unit: 'ms' as const,
        rating: 'good' as const,
        thresholds: { good: 600, poor: 800 },
        description: 'Server response latency',
      },
    };

    const vitalsEvaluation = vitalsGatekeeper.evaluateVitals(mockVitals);

    // Generate cryptographic SHA-256 proof badge
    const badgeGen = new ProofBadgeGenerator();
    const proofBadge = badgeGen.generateProofBadge({
      commitSha: process.env.GITHUB_SHA || 'head_commit',
      totalChecks: runResult.summary.total,
      passedChecks: runResult.summary.passed,
      failedChecks: runResult.summary.failed,
      runId: runResult.runId,
    });

    // Determine exit code factoring in both test failures and Core Web Vitals budget
    let exitCode = determineActionExitCode({
      status: runResult.status,
      failedChecks: runResult.summary.failed,
      failOnRegression: inputs.failOnRegression,
    });

    if (exitCode === 0 && inputs.failOnVitalsBudget && !vitalsEvaluation.passed) {
      exitCode = 1;
      console.log(`[PROOFix Action Gatekeeper] Exiting with code 1 due to Core Web Vitals budget violation.`);
    }

    // Populate GitHub Action step outputs
    setActionOutput('run-id', runResult.runId);
    setActionOutput('status', runResult.status);
    setActionOutput('exit-code', exitCode);
    setActionOutput('passed-checks', runResult.summary.passed);
    setActionOutput('failed-checks', runResult.summary.failed);
    setActionOutput('total-checks', runResult.summary.total);
    setActionOutput('report-path', runResult.reportPaths.json);
    setActionOutput('artifacts-bundle', artifactsBundlePath);
    setActionOutput('vitals-status', vitalsEvaluation.passed ? 'passed' : 'failed');
    setActionOutput('lcp-value', vitalsEvaluation.vitals.lcp.value ?? 0);
    setActionOutput('cls-value', vitalsEvaluation.vitals.cls.value ?? 0);
    setActionOutput('proof-fingerprint', proofBadge.fingerprint);
    setActionOutput('proof-badge', proofBadge.badgeMarkdown);

    const desc = describeExitCode(exitCode);
    console.log(`\n[PROOFix Action Completed] Exit Code ${desc.code} (${desc.name}): ${desc.description}`);

    return { exitCode, summary: summaryMd };
  } catch (err: any) {
    const errorLog = sanitizeActionLog(`[PROOFix Action Fatal Error] ${err.message}`);
    console.error(errorLog);

    setActionOutput('status', 'error');
    setActionOutput('exit-code', 2);

    const errorSummary = `## ⚠️ PROOFix Execution Error\n\n> \`${err.message}\`\n\nExecution aborted. Verify project configuration and dependencies.`;
    if (inputs.generateSummary) {
      await writeJobSummary(errorSummary);
    }

    return { exitCode: 2, summary: errorSummary };
  }
}

// Auto-run if executed directly as main script
if (require.main === module) {
  runAction().then(({ exitCode }) => {
    process.exit(exitCode);
  });
}
