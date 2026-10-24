/**
 * Zero-Setup Interactive Demo Playground Data Contracts
 *
 * Defines models, scenario metadata, fault signatures, AI diagnosis contracts,
 * and execution telemetry for one-click demo sandbox scenarios.
 */

import { VerificationRun, TestResult, Finding, Project } from '../types';
import { FixProposal } from '../types/proposal';

export type DemoScenarioId =
  | 'ecommerce_checkout'
  | 'hydration_mismatch'
  | 'sql_injection_preflight';

export type DemoScenarioCategory =
  | 'functional_e2e'
  | 'framework_react'
  | 'security_preflight';

export type FaultSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ExpectedFailureSignature {
  stepName: string;
  category: 'smoke' | 'navigation' | 'interaction' | 'api' | 'security';
  expectedStatus: 'failed';
  errorMessage: string;
  httpStatus?: number;
  domSelector?: string;
  detectedStage: string;
}

export interface ScenarioFaultDetail {
  headline: string;
  technicalSummary: string;
  faultyFile: string;
  severity: FaultSeverity;
  cveReference?: string;
  expectedFailure: ExpectedFailureSignature;
}

export interface BenchmarkScorecard {
  detectionTimeMs: number;
  aiDiagnosisConfidence: number;
  patchGenerationTimeMs: number;
  verificationPassRate: number;
  zeroConfigRating: string;
}

export interface DemoScenarioContract {
  id: DemoScenarioId;
  title: string;
  subtitle: string;
  description: string;
  category: DemoScenarioCategory;
  badge: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  fault: ScenarioFaultDetail;
  aiDiagnosis: {
    rootCause: string;
    explanation: string;
    suggestedFix: string;
    confidenceScore: number;
  };
  fixProposal: {
    targetFile: string;
    patchDiff: string;
    summary: string;
  };
  benchmark: BenchmarkScorecard;
  seedProject: Project;
  preloadedRun: VerificationRun;
  initialTestResults: TestResult[];
  initialFindings: Finding[];
}

export interface PlaygroundLaunchOptions {
  mockMode?: boolean;
  autoApplyFix?: boolean;
  telemetryDelayMs?: number;
}

export interface PlaygroundRunResponse {
  success: boolean;
  scenarioId: DemoScenarioId;
  projectId: string;
  runId: string;
  runUrl: string;
  status: string;
  message: string;
  stagesCompleted: number;
  faultDetected: boolean;
}

export interface PlaygroundFixResult {
  success: boolean;
  scenarioId: DemoScenarioId;
  originalRunId: string;
  verifiedRunId: string;
  proposalId: string;
  patchApplied: boolean;
  testsPassed: number;
  testsFailed: number;
  verifiedRunUrl: string;
  status: 'passed' | 'failed';
}
