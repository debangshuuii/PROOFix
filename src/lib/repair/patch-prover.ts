import type { TestResult } from '../types/index.ts';
import type { FixProposal } from '../types/proposal.ts';

export type PatchProvingOutcome =
  | 'verified_fix'
  | 'partial_fix'
  | 'regression_detected'
  | 'failed';

export interface PatchProvingReport {
  proposalId: string;
  outcome: PatchProvingOutcome;
  failingCheckResolved: boolean;
  regressionsCount: number;
  durationMs: number;
  targetCheckResult: {
    status: 'passed' | 'failed';
    message: string;
  };
  regressionCheckResults: Array<{
    name: string;
    status: 'passed' | 'failed';
  }>;
  diagnostics: string;
  provenAt: string;
}

export interface VerificationCheckRunner {
  runCheck: (checkName: string, workspacePath: string) => Promise<{ passed: boolean; message: string; durationMs: number }>;
}

/**
 * Executes post-patch verification proving the fix works and introduced zero regressions.
 */
export async function provePatchFix(
  proposal: FixProposal,
  workspacePath: string,
  targetCheckName: string,
  regressionCheckNames: string[],
  runner: VerificationCheckRunner
): Promise<PatchProvingReport> {
  const startTime = Date.now();

  // 1. Re-run the target failing check
  const targetRun = await runner.runCheck(targetCheckName, workspacePath);
  const failingCheckResolved = targetRun.passed;

  // 2. If target check failed, the patch did not work
  if (!failingCheckResolved) {
    return {
      proposalId: proposal.id,
      outcome: 'failed',
      failingCheckResolved: false,
      regressionsCount: 0,
      durationMs: Date.now() - startTime,
      targetCheckResult: {
        status: 'failed',
        message: targetRun.message,
      },
      regressionCheckResults: [],
      diagnostics: `Target check "${targetCheckName}" still failed after patch application: ${targetRun.message}`,
      provenAt: new Date().toISOString(),
    };
  }

  // 3. Target check passed! Now run regression suite across adjacent checks
  const regressionResults: Array<{ name: string; status: 'passed' | 'failed' }> = [];
  let regressionsCount = 0;

  for (const check of regressionCheckNames) {
    const regRun = await runner.runCheck(check, workspacePath);
    if (!regRun.passed) {
      regressionsCount++;
      regressionResults.push({ name: check, status: 'failed' });
    } else {
      regressionResults.push({ name: check, status: 'passed' });
    }
  }

  let outcome: PatchProvingOutcome = 'verified_fix';
  let diagnostics = `Patch successfully verified: "${targetCheckName}" passed and all ${regressionCheckNames.length} regression checks passed.`;

  if (regressionsCount > 0) {
    outcome = 'regression_detected';
    diagnostics = `Regression alert: Target check passed, but patch caused ${regressionsCount} regression(s) in adjacent tests.`;
  }

  return {
    proposalId: proposal.id,
    outcome,
    failingCheckResolved: true,
    regressionsCount,
    durationMs: Date.now() - startTime,
    targetCheckResult: {
      status: 'passed',
      message: targetRun.message,
    },
    regressionCheckResults: regressionResults,
    diagnostics,
    provenAt: new Date().toISOString(),
  };
}
