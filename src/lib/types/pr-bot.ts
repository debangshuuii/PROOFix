/**
 * PROOFix Production CI/CD & Turnkey GitHub PR Bot Types
 * Defines interfaces for Core Web Vitals Budget Gate, Cryptographic SHA-256 Proof Badge,
 * Side-by-Side Visual Regression Slider, and Slash Command Comment Handlers.
 */

import type { CoreWebVitals, VitalRating } from './performance.ts';
import type { CheckRunConclusion, CheckRunStatus } from './git-integrations.ts';

export interface WebVitalsBudgetConfig {
  maxLcpMs: number;          // Default: 2500ms (2.5s)
  maxClsScore: number;       // Default: 0.10
  maxInpMs?: number;         // Default: 200ms
  maxTtfbMs?: number;        // Default: 800ms
  warnLcpMs?: number;        // Default: 2000ms
  warnClsScore?: number;     // Default: 0.05
  failOnBudgetViolation: boolean;
}

export interface WebVitalsViolation {
  metric: 'LCP' | 'CLS' | 'INP' | 'TTFB';
  actualValue: number;
  threshold: number;
  severity: 'warning' | 'error';
  unit: 'ms' | 'score';
  deltaVsBaseline?: number;
  recommendation: string;
}

export interface WebVitalsGateResult {
  passed: boolean;
  score: number; // 0 - 100
  rating: VitalRating;
  vitals: CoreWebVitals;
  violations: WebVitalsViolation[];
  summaryMessage: string;
}

export interface CryptographicProofBadge {
  fingerprint: string;           // SHA-256 hex string
  signature: string;             // Tamper-evident HMAC signature
  status: 'VERIFIED' | 'FAILED' | 'TAMPERED';
  zeroRegressionPassRate: number;// 0.0 - 1.0 (1.0 = 100%)
  commitSha: string;
  baselineSha?: string;
  timestamp: string;
  certifiedBy: string;           // e.g. "PROOFix-Dual-Pass-Prover-v1"
  badgeMarkdown: string;
  badgeHtml: string;
  verifyUrl: string;
}

export interface VisualSliderComparison {
  routePath: string;
  baselineImageUrl: string;
  candidateImageUrl: string;
  diffImageUrl?: string;
  mismatchPercentage: number;     // e.g. 0.42%
  hasRegression: boolean;
  viewport: {
    width: number;
    height: number;
    name: string;
  };
  sliderHtml: string;
}

export type PrSlashCommandType =
  | 'fix'
  | 'heal'
  | 'prove'
  | 'budget'
  | 'help'
  | 'unknown';

export interface ParsedSlashCommand {
  command: PrSlashCommandType;
  args: string[];
  rawText: string;
  commentAuthor: string;
  commentId: number;
  pullRequestNumber: number;
  isValid: boolean;
}

export interface SlashCommandExecutionResult {
  command: PrSlashCommandType;
  success: boolean;
  message: string;
  replyCommentBody: string;
  committedPatchSha?: string;
  patchBranchName?: string;
  newCheckRunId?: string;
}

export interface RichPrReviewCommentData {
  repoFullName: string;
  pullRequestNumber: number;
  commitSha: string;
  runId: string;
  verificationPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  durationMs: number;
  proofBadge: CryptographicProofBadge;
  vitalsGate: WebVitalsGateResult;
  visualComparisons: VisualSliderComparison[];
  selfHealingDiff?: string;
  oneClickApplyUrl: string;
  remedyInstructions?: string;
}
