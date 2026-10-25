export type ProofStatus = 'PROVEN' | 'REFUTED' | 'FLAKY_REGRESSION' | 'PENDING' | 'ERROR';

export interface ProverExecutionRequest {
  scenarioId?: string;
  patchDiff?: string;
  targetFile?: string;
  maxIterations?: number;
  timeoutMs?: number;
  workspacePath?: string;
}

export interface RegressionCheckResult {
  checkId: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface ProofCertificate {
  certificateId: string;
  timestamp: string;
  status: ProofStatus;
  scenarioId: string;
  sha256Fingerprint: string;
  patchHash: string;
  pass1Failure: {
    checkId: string;
    errorSummary: string;
  };
  pass2Verification: {
    targetCheckPassed: boolean;
    regressionCount: number;
    passedRegressionCount: number;
    passRate: number;
    latencyMs: number;
  };
  certifiedBy: 'PROOFix-Shadow-Prover-v1';
}
