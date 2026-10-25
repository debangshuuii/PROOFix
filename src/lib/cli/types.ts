/**
 * PROOFix CLI Type Definitions & Interfaces
 * Comprehensive contracts for diagnostics, execution pipelines, patch review, and watch mode.
 */

export type CliCommand =
  | 'doctor'
  | 'run'
  | 'fix'
  | 'watch'
  | 'analyze'
  | 'status'
  | 'help'
  | 'version'
  | 'mcp'
  | 'prove';

export type DoctorCheckStatus = 'passed' | 'warning' | 'failed' | 'healed';

export interface DoctorCheckResult {
  id: string;
  name: string;
  category: 'runtime' | 'browser' | 'network' | 'ai';
  status: DoctorCheckStatus;
  message: string;
  details?: Record<string, unknown> | string;
  recommendation?: string;
  autoFixAvailable?: boolean;
}

export interface DoctorReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  hostInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
  };
  checks: DoctorCheckResult[];
  autoHealed?: boolean;
}

export type RunPipelineStage =
  | 'preflight'
  | 'mock_replay'
  | 'action_simulation'
  | 'visual_regression'
  | 'accessibility'
  | 'performance'
  | 'semantic_vision'
  | 'api_fuzzing'
  | 'security_gate'
  | 'distributed_tracing'
  | 'self_healing_repair';

export type PipelineStageStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface PipelineStageInfo {
  id: RunPipelineStage;
  name: string;
  description: string;
  status: PipelineStageStatus;
  durationMs?: number;
  error?: string;
  logs: string[];
}

export interface PipelineProgressEvent {
  stageId: RunPipelineStage;
  stageIndex: number;
  totalStages: number;
  stageName: string;
  status: PipelineStageStatus;
  elapsedMs: number;
  log?: string;
}

export interface CliRunOptions {
  interactive?: boolean;
  scenario?: string;
  headless?: boolean;
  verbose?: boolean;
  json?: boolean;
  bail?: boolean;
}

export interface CliRunResult {
  runId: string;
  scenarioId?: string;
  status: 'passed' | 'failed';
  totalDurationMs: number;
  stages: PipelineStageInfo[];
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  summary: string;
}

export type FixReviewChoice = 'y' | 'n' | 'diff' | 'help';

export interface CliFixOptions {
  apply?: boolean;
  rollback?: boolean;
  scenario?: string;
  interactive?: boolean;
  json?: boolean;
}

export interface PatchProposal {
  id: string;
  scenarioId?: string;
  targetFile: string;
  originalContent: string;
  patchedContent: string;
  unifiedDiff: string;
  additions: number;
  deletions: number;
  rationale: string;
}

export interface PatchApplyResult {
  success: boolean;
  targetFile: string;
  backupPath?: string;
  message: string;
}

export interface CliWatchOptions {
  debounceMs?: number;
  scenario?: string;
  clearScreen?: boolean;
  targetDir?: string;
}

export interface ParsedCliArgs {
  command: CliCommand;
  flags: Record<string, boolean | string | number>;
  positional: string[];
}
