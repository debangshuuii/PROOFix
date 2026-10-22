import type { TestResult } from '../types/index.ts';
import type { FixProposal } from '../types/proposal.ts';
import type {
  PatchProvingOutcome,
  PatchProvingReport,
  VerificationCheckResult,
  ProverExecutionConfig,
} from '../types/patch-prover.ts';
import { DEFAULT_PROVER_CONFIG } from '../types/patch-prover.ts';
import { executeCheckInWorkspace } from './isolated-test-runner.ts';

export type { PatchProvingOutcome, PatchProvingReport } from '../types/patch-prover.ts';

export interface VerificationCheckRunner {
  runCheck: (
    checkName: string,
    workspacePath: string
  ) => Promise<{ passed: boolean; message: string; durationMs: number }>;
}

/**
 * Executes post-patch verification proving the fix works and introduced zero regressions.
 * Maintains 100% backwards-compatibility with existing tests and callers.
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

  // 2. If target check failed, the patch did not resolve the issue
  if (!failingCheckResolved) {
    return {
      proposalId: proposal.id,
      outcome: 'failed',
      failingCheckResolved: false,
      regressionsCount: 0,
      durationMs: Date.now() - startTime,
      targetCheckResult: {
        name: targetCheckName,
        passed: false,
        status: 'failed',
        durationMs: targetRun.durationMs,
        errorMessage: targetRun.message,
      },
      regressionCheckResults: [],
      diagnostics: `Target check "${targetCheckName}" still failed after patch application: ${targetRun.message}`,
      provenAt: new Date().toISOString(),
    };
  }

  // 3. Target check passed! Now run regression suite across adjacent checks
  const regressionResults: VerificationCheckResult[] = [];
  let regressionsCount = 0;

  for (const check of regressionCheckNames) {
    const regRun = await runner.runCheck(check, workspacePath);
    if (!regRun.passed) {
      regressionsCount++;
      regressionResults.push({
        name: check,
        passed: false,
        status: 'failed',
        durationMs: regRun.durationMs,
        errorMessage: regRun.message,
      });
    } else {
      regressionResults.push({
        name: check,
        passed: true,
        status: 'passed',
        durationMs: regRun.durationMs,
        stdout: regRun.message,
      });
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
      name: targetCheckName,
      passed: true,
      status: 'passed',
      durationMs: targetRun.durationMs,
      stdout: targetRun.message,
    },
    regressionCheckResults: regressionResults,
    diagnostics,
    provenAt: new Date().toISOString(),
  };
}

/**
 * Advanced patch prover supporting candidate proposals and automated workspace execution
 */
export async function proveCandidatePatch(params: {
  proposal: FixProposal | { id: string; candidateId?: string; [key: string]: any };
  workspacePath: string;
  targetCheckName: string;
  regressionCheckNames?: string[];
  runner?: VerificationCheckRunner;
  config?: Partial<ProverExecutionConfig>;
}): Promise<PatchProvingReport> {
  const config = { ...DEFAULT_PROVER_CONFIG, ...params.config };
  const regressionChecks = (params.regressionCheckNames || []).slice(0, config.maxRegressionChecks);

  // If a custom runner is provided, adapt to provePatchFix
  if (params.runner) {
    return provePatchFix(
      params.proposal as FixProposal,
      params.workspacePath,
      params.targetCheckName,
      regressionChecks,
      params.runner
    );
  }

  // Default isolated execution runner
  const defaultRunner: VerificationCheckRunner = {
    runCheck: async (checkName: string, wsPath: string) => {
      const res = await executeCheckInWorkspace(checkName, wsPath, {
        timeoutMs: config.maxTimeoutMs,
      });
      return {
        passed: res.passed,
        message: res.passed ? res.stdout || 'Passed' : res.errorMessage || res.stderr || 'Failed',
        durationMs: res.durationMs,
      };
    },
  };

  const report = await provePatchFix(
    params.proposal as FixProposal,
    params.workspacePath,
    params.targetCheckName,
    regressionChecks,
    defaultRunner
  );

  report.candidateId = (params.proposal as any).candidateId;
  report.verifiedWorkspaceId = params.workspacePath;
  return report;
}
