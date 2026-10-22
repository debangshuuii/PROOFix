export type ProjectProvider = 'github' | 'local_upload' | 'sample_fixture';

export type RunStatus =
  | 'pending'
  | 'importing'
  | 'analyzing'
  | 'preparing'
  | 'installing'
  | 'building'
  | 'starting'
  | 'testing'
  | 'analyzing_ai'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BuildStatus = 'pending' | 'success' | 'failed' | 'skipped';
export type StartupStatus = 'pending' | 'success' | 'failed' | 'skipped';

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'inconclusive';

export type TestRisk = 'safe_read_only' | 'simulated_input' | 'destructive_blocked';

export type TestCategory =
  | 'smoke'
  | 'route_discovery'
  | 'user_flow'
  | 'form_validation'
  | 'error_boundary'
  | 'responsive_layout'
  | 'api_health'
  | 'performance_audit'
  | 'accessibility_audit';

export type FailureCategory =
  | 'uncaught_js_exception'
  | 'http_error'
  | 'navigation_failed'
  | 'assertion_failed'
  | 'timeout'
  | 'readiness_failed'
  | 'layout_overflow'
  | 'build_error'
  | 'startup_error'
  | 'performance_budget_exceeded'
  | 'performance_regression'
  | 'accessibility_violation';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface DiscoveredRoute {
  path: string;
  type: 'page' | 'api' | 'static';
  method?: string;
  fileSource: string;
  isDynamic: boolean;
}

export interface ProjectAnalysis {
  framework: string;
  runtime: string;
  packageManager: string;
  scripts: Record<string, string>;
  entryPoints: string[];
  routes: DiscoveredRoute[];
  envVarsDetected: string[]; // only names, values strictly redacted
  existingTests: string[];
  dockerConfig: {
    hasDockerfile: boolean;
    hasDockerCompose: boolean;
  };
  inferredStartup: {
    command: string;
    port: number;
    readinessPath: string;
    confidence: 'high' | 'medium' | 'low';
    rationale: string;
  };
  blockers: {
    severity: 'error' | 'warning';
    message: string;
    suggestedResolution: string;
  }[];
}

export interface ProjectConfig {
  startupCommand?: string;
  buildCommand?: string;
  installCommand?: string;
  port?: number;
  readinessPath?: string;
  timeoutSecs?: number;
  environmentVariables?: Record<string, string>;
  maxRetries?: number;
  videoConfig?: import('./video').VideoRecordingConfig;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  repoUrl?: string;
  repoProvider: ProjectProvider;
  defaultBranch: string;
  localPath?: string;
  config: ProjectConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  commitHash: string;
  branch: string;
  analysis: ProjectAnalysis;
  createdAt: string;
}

export interface TestStep {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'skipped';
  durationMs: number;
  error?: string;
  screenshot?: string;
}

export interface ConsoleErrorItem {
  timestamp: string;
  type: 'error' | 'warning' | 'exception';
  text: string;
  location?: string;
}

export interface NetworkFailureItem {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  failureReason?: string;
  durationMs?: number;
}

export interface TestResultEvidence {
  screenshotPath?: string;
  consoleErrors: ConsoleErrorItem[];
  networkFailures: NetworkFailureItem[];
  steps: TestStep[];
  viewport?: { width: number; height: number };
  videoPath?: string;
  videoArtifactId?: string;
  videoStatus?: import('./video').VideoProcessingStatus;
}

export interface TestResult {
  id: string;
  runId: string;
  testCaseId?: string;
  name: string;
  category: TestCategory;
  status: TestStatus;
  durationMs: number;
  actualResult: string;
  failureCategory?: FailureCategory;
  errorDetails?: {
    message: string;
    stack?: string;
    url?: string;
    stepFailed?: string;
  };
  evidence: TestResultEvidence;
  startedAt: string;
  completedAt: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: TestCategory;
  testSource: 'deterministic_browser' | 'project_existing' | 'ai_generated';
  riskClassification: TestRisk;
  expectedResult: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  isDocumented: boolean;
  preconditions?: string[];
  steps: string[];
  createdAt: string;
}

export interface Finding {
  id: string;
  runId: string;
  testResultId?: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  observedEvidence: string; // factual observation
  aiHypothesis: string;    // AI probabilistic deduction
  suggestedFix: string;    // actionable steps
  patchPreview?: string;   // unified diff format
  affectedFiles?: string[];
  sideEffects?: string;
  verificationStep?: string;
  confidenceScore: number; // 0 to 100
  reviewStatus: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  testResultId?: string;
  artifactType: 'screenshot' | 'console_log' | 'network_log' | 'execution_trace' | 'diff_patch' | 'report_html' | 'report_json';
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface VerificationRun {
  id: string;
  projectId: string;
  projectVersionId: string;
  runNumber: number;
  status: RunStatus;
  buildStatus: BuildStatus;
  startupStatus: StartupStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  commitHash: string;
  branch: string;
  executionConfig: {
    isolationMode: 'local_process_sandbox' | 'container_isolated';
    port: number;
    timeoutMs: number;
  };
  isolationDisclaimer: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    inconclusive: number;
  };
  errorSummary?: string;
  logs: string[];
  createdAt: string;
}

export interface RunComparison {
  baseRunId: string;
  targetRunId: string;
  projectId: string;
  newFailures: TestResult[];
  fixedTests: TestResult[];
  statusRegressions: {
    testName: string;
    previousStatus: TestStatus;
    currentStatus: TestStatus;
  }[];
  newConsoleErrors: ConsoleErrorItem[];
  durationDeltaMs: number;
  isSameCommit: boolean;
}

export interface SystemSettings {
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'offline' | 'local_ollama' | 'local_vllm';
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  localAiBaseUrl?: string;
  localAiModel?: string;
  githubToken?: string;
  sandboxMemoryLimitMb: number;
  sandboxTimeoutSecs: number;
  allowOutboundNetwork: boolean;
}

export * from './proposal.ts';
export * from './visual-regression.ts';
export * from './viewport.ts';
export * from './journey.ts';
export * from './video.ts';
export * from './security.ts';
export * from './notification.ts';
export * from './performance.ts';
export * from './accessibility.ts';
export * from './self-healing.ts';
export * from './semantic-vision.ts';
export * from './live-companion.ts';
export * from './api-fuzzing.ts';
export * from './mock-replay.ts';
export * from './sandbox-isolation.ts';
export * from './queue-database.ts';
export * from './governance-compliance.ts';
export * from './navigation-palette.ts';
export * from './git-integrations.ts';
export * from './otel-tracing.ts';
export * from './database-adapters.ts';
export * from './chaos-crawler.ts';
export * from './live-transport.ts';
export * from './execution.ts';
export * from './navigation-crawler.ts';
export * from './api-endpoint-agent.ts';
export * from './interactive-ui-agent.ts';
export * from './quality-auditing.ts';
export * from './viewport-matrix-agent.ts';
export * from './ai-diagnosis.ts';
export * from './patch-proposal.ts';
export * from './repair-workspace.ts';
export * from './patch-prover.ts';
