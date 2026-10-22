/**
 * PROOFix Automated Patch Prover and Regression Verification Schemas
 */

export type PatchProvingOutcome =
  | 'verified_fix'
  | 'partial_fix'
  | 'regression_detected'
  | 'failed'
  | 'timeout'
  | 'syntax_error';

export interface VerificationCheckResult {
  name: string;
  category?: string;
  passed: boolean;
  durationMs: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  errorMessage?: string;
}

export interface PatchProvingReport {
  proposalId: string;
  candidateId?: string;
  outcome: PatchProvingOutcome;
  failingCheckResolved: boolean;
  regressionsCount: number;
  durationMs: number;
  targetCheckResult: VerificationCheckResult;
  regressionCheckResults: VerificationCheckResult[];
  coverageDiff?: {
    filesCovered: number;
    deltaPercent: number;
  };
  diagnostics: string;
  provenAt: string;
  verifiedWorkspaceId?: string;
}

export interface ProverExecutionConfig {
  maxTimeoutMs: number;
  runAdjacentChecks: boolean;
  maxRegressionChecks: number;
  captureConsole: boolean;
  failFast: boolean;
  isolatedPort?: number;
}

export const DEFAULT_PROVER_CONFIG: ProverExecutionConfig = {
  maxTimeoutMs: 30000,
  runAdjacentChecks: true,
  maxRegressionChecks: 10,
  captureConsole: true,
  failFast: false,
};
