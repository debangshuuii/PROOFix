import { TestResult } from '../lib/types';

export type ActionTestItem = TestResult | {
  id?: string;
  testId?: string;
  name?: string;
  title?: string;
  route?: string;
  category?: string;
  status: string;
  durationMs?: number;
  error?: string;
  errorDetails?: { message: string; url?: string; stack?: string };
  consoleLogs?: any[];
  evidence?: { consoleErrors?: any[]; networkFailures?: any[] };
};

export interface HydrationDriftDetail {
  route: string;
  component?: string;
  errorMessage: string;
  serverValue?: string;
  clientValue?: string;
  timestamp: string;
}

export interface BrokenRouteDetail {
  route: string;
  httpStatus: number;
  referringPage?: string;
  selector?: string;
  durationMs?: number;
}

export interface VisualDiffDetail {
  testId: string;
  route: string;
  baselineScreenshotUrl?: string;
  currentScreenshotUrl?: string;
  diffScreenshotUrl?: string;
  mismatchPixels: number;
  mismatchPercentage: number;
  passed: boolean;
}

export interface FailureVideoStep {
  stepIndex: number;
  stepName: string;
  status: 'passed' | 'failed' | 'timeout';
  videoTimestampSec: number;
  videoUrl?: string;
  localVideoPath?: string;
  errorSnippet?: string;
}

export interface AutoFixDispatchLink {
  workflowName: string;
  dispatchUrl: string;
  branchName: string;
  prNumber?: number;
  buttonMarkdown: string;
}

export interface StickyCommentOptions {
  prNumber: number;
  repoOwner: string;
  repoName: string;
  commitSha: string;
  runId: string;
  status: 'passed' | 'failed' | 'error';
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
  };
  hydrationDrifts: HydrationDriftDetail[];
  brokenRoutes: BrokenRouteDetail[];
  visualDiffs: VisualDiffDetail[];
  videoSteps: FailureVideoStep[];
  autoFix?: AutoFixDispatchLink;
  proofBadgeMarkdown: string;
  proofFingerprint: string;
  proofPreviewUrl?: string;
  githubToken?: string;
}

export interface StickyCommentResult {
  action: 'created' | 'updated' | 'skipped';
  commentId?: number;
  commentUrl?: string;
  bodyMarkdown: string;
}

export interface CheckRunGateResult {
  gateName: string;
  passed: boolean;
  conclusion: 'success' | 'failure' | 'neutral';
  title: string;
  summary: string;
  hydrationCount: number;
  brokenRouteCount: number;
  annotations: Array<{
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: 'failure' | 'warning' | 'notice';
    message: string;
    title: string;
  }>;
}
