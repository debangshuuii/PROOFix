/**
 * Core type contracts for PROOFix VS Code & Cursor IDE extension.
 */

export type RouteVerificationStatus = 'proven' | 'failing' | 'untested' | 'proving';

export interface RouteHandlerInfo {
  routePath: string;
  filePath: string;
  line: number;
  isApi: boolean;
  isDynamic: boolean;
  exportName?: string;
}

export interface RouteStatusRecord {
  routePath: string;
  status: RouteVerificationStatus;
  passedJourneys: number;
  totalJourneys: number;
  durationMs: number;
  lastVerified: string;
  failureSnippet?: string;
  proofFingerprint?: string;
}

export interface ProposedPatch {
  proposalId: string;
  targetFile: string;
  routePath: string;
  originalContent: string;
  patchedContent: string;
  unifiedDiff: string;
  explanation: string;
  confidence: number;
}

export interface ProofixExtensionConfig {
  serverUrl: string;
  showGutterBadges: boolean;
  enableCodeLens: boolean;
  autoProveOnSave: boolean;
  preferredAiProvider: 'gemini' | 'openai' | 'anthropic' | 'offline';
  diffViewerMode: 'split' | 'unified';
}

export interface TestRunTelemetry {
  testId: string;
  routePath: string;
  status: 'passed' | 'failed' | 'running';
  durationMs: number;
  error?: string;
}
