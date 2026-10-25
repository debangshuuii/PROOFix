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
