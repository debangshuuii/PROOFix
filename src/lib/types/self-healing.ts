/**
 * PROOFix Autonomous Self-Healing & Verified Pull Request Loop Types
 */

export type SelfHealingMode =
  | 'manual_review_only'  // Diagnoses and generates diffs, requires explicit click to apply
  | 'semi_autonomous'     // Automatically applies & proves in sandbox, requires click to open PR
  | 'fully_autonomous';   // Automatically applies, proves, and opens a GitHub PR

export type SelfHealingStatus =
  | 'initializing'
  | 'synthesizing_context'
  | 'generating_patch'
  | 'sandboxing'
  | 'applying_patch'
  | 'verifying_patch'
  | 'publishing_pr'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface SelfHealingConfig {
  enabled: boolean;
  mode: SelfHealingMode;
  maxIterations: number;            // 1 to 5, default 3
  minConfidenceScore: number;       // 50 to 100, default 75
  allowedFileExtensions: string[];  // e.g. ['.ts', '.tsx', '.js', '.jsx', '.css', '.json']
  protectedFilePatterns: string[];  // e.g. ['.env*', 'package-lock.json', 'Dockerfile', '.git/**']
  requireGreenRegressionSuite: boolean; // Must pass regression checks
  createDraftPullRequest: boolean;  // Default true
  targetBranchPrefix: string;       // Default 'proofix/heal-'
  githubTokenEnvVar: string;        // Default 'GITHUB_TOKEN'
}

export interface SelfHealingPolicyCheckResult {
  allowed: boolean;
  reasons: string[];
}

export interface SelfHealingIterationRecord {
  iterationNumber: number;
  proposalId: string;
  diffSummary: string;
  verificationStatus: 'passed' | 'failed' | 'partial' | 'regression';
  verificationDurationMs: number;
  failingChecksResolved: string[];
  newFailuresIntroduced: string[];
  diagnostics: string;
  timestamp: string;
}

export interface SelfHealingSession {
  id: string;
  runId: string;
  projectId: string;
  failureId: string;
  status: SelfHealingStatus;
  currentIteration: number;
  maxIterations: number;
  config: SelfHealingConfig;
  iterations: SelfHealingIterationRecord[];
  activeWorkspacePath?: string;
  gitBranch?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  finalOutcome?: 'verified_fix' | 'partial_fix' | 'unfixable' | 'policy_blocked';
  logs: string[];
  createdAt: string;
  updatedAt: string;
}
