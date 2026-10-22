/**
 * PROOFix Autonomous Self-Healing Risk Tier Matrix and Governance Policy Schemas
 */

export type RiskTier = 'tier1_low' | 'tier2_medium' | 'tier3_high' | 'tier4_critical';

export interface FileSensitivityRule {
  pattern: string;
  tier: RiskTier;
  reason: string;
  allowAutoApply: boolean;
}

export interface SelfHealingRiskAssessment {
  overallTier: RiskTier;
  riskScore: number; // 0 (safest) - 100 (highest risk)
  evaluatedFiles: string[];
  highRiskFiles: string[];
  sensitiveKeywordsDetected: string[];
  requiresHumanApproval: boolean;
  autoApplyPermitted: boolean;
  justification: string;
}

export interface HealingRateLimitPolicy {
  maxRepairsPerHour: number;
  maxConsecutiveFailures: number;
  cooldownMinutesOnFailure: number;
  maxDiffLinesPerPatch: number;
  maxFilesPerPatch: number;
}

export const DEFAULT_HEALING_RATE_LIMIT_POLICY: HealingRateLimitPolicy = {
  maxRepairsPerHour: 12,
  maxConsecutiveFailures: 3,
  cooldownMinutesOnFailure: 10,
  maxDiffLinesPerPatch: 200,
  maxFilesPerPatch: 5,
};

export const DEFAULT_FILE_SENSITIVITY_RULES: FileSensitivityRule[] = [
  {
    pattern: '(?:auth|login|session|crypto|secret|token|password|vault)',
    tier: 'tier4_critical',
    reason: 'Security and authentication primitives require mandatory human review.',
    allowAutoApply: false,
  },
  {
    pattern: '(?:api/|server/|database|db/|prisma|schema\\.prisma|migrate)',
    tier: 'tier3_high',
    reason: 'Backend API routes and data persistence models carry backend regression risks.',
    allowAutoApply: false,
  },
  {
    pattern: '(?:next\\.config|tsconfig|package\\.json)',
    tier: 'tier3_high',
    reason: 'Root project build configurations affect application bundling.',
    allowAutoApply: false,
  },
  {
    pattern: '(?:components/|hooks/|utils/|lib/)',
    tier: 'tier2_medium',
    reason: 'Application logic and client components.',
    allowAutoApply: true,
  },
  {
    pattern: '(?:\\.css|\\.scss|\\.md|README)',
    tier: 'tier1_low',
    reason: 'Declarative styles and documentation.',
    allowAutoApply: true,
  },
];
