import { parseUnifiedDiff } from './patch-validator.ts';
import type {
  FileSensitivityRule,
  HealingRateLimitPolicy,
  RiskTier,
  SelfHealingRiskAssessment,
} from '../types/self-healing-policy.ts';
import {
  DEFAULT_FILE_SENSITIVITY_RULES,
  DEFAULT_HEALING_RATE_LIMIT_POLICY,
} from '../types/self-healing-policy.ts';
import type { SelfHealingMode } from '../types/self-healing.ts';

// In-memory rate limiting ledger: projectId -> timestamps of repairs
const repairTimestamps = new Map<string, number[]>();
const consecutiveFailures = new Map<string, number>();

/**
 * Assesses patch risk level based on modified files and code patterns
 */
export function assessPatchRisk(
  diffText: string,
  rules: FileSensitivityRule[] = DEFAULT_FILE_SENSITIVITY_RULES
): SelfHealingRiskAssessment {
  const patches = parseUnifiedDiff(diffText);
  const evaluatedFiles: string[] = [];
  const highRiskFiles: string[] = [];
  const sensitiveKeywordsDetected: string[] = [];

  let highestTier: RiskTier = 'tier1_low';
  let maxRiskWeight = 10;

  const tierWeights: Record<RiskTier, number> = {
    tier1_low: 15,
    tier2_medium: 40,
    tier3_high: 75,
    tier4_critical: 95,
  };

  const sensitivePattern = /(?:jwt|password|bearer|secret|auth|privatekey|execSync|eval\(|drop\s+table)/i;

  for (const patch of patches) {
    const filePath = (patch.newPath || patch.oldPath).replace(/^[ab]\//, '');
    evaluatedFiles.push(filePath);

    // Check file against sensitivity rules
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(filePath)) {
        if (rule.tier === 'tier4_critical' || rule.tier === 'tier3_high') {
          highRiskFiles.push(filePath);
        }

        const weight = tierWeights[rule.tier];
        if (weight > maxRiskWeight) {
          maxRiskWeight = weight;
          highestTier = rule.tier;
        }
      }
    }

    // Check hunk lines for sensitive tokens
    for (const hunk of patch.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          const match = line.match(sensitivePattern);
          if (match && !sensitiveKeywordsDetected.includes(match[0].toLowerCase())) {
            sensitiveKeywordsDetected.push(match[0].toLowerCase());
          }
        }
      }
    }
  }

  // If sensitive keywords are added, elevate to tier4_critical
  if (sensitiveKeywordsDetected.length > 0) {
    highestTier = 'tier4_critical';
    maxRiskWeight = Math.max(maxRiskWeight, 90);
  }

  const requiresHumanApproval = highestTier === 'tier3_high' || highestTier === 'tier4_critical';
  const autoApplyPermitted = highestTier === 'tier1_low' || highestTier === 'tier2_medium';

  let justification = `Risk level assessed at ${highestTier.toUpperCase()} (score ${maxRiskWeight}/100).`;
  if (highRiskFiles.length > 0) {
    justification += ` High-risk files modified: ${highRiskFiles.join(', ')}.`;
  }
  if (sensitiveKeywordsDetected.length > 0) {
    justification += ` Sensitive code primitives detected: ${sensitiveKeywordsDetected.join(', ')}.`;
  }

  return {
    overallTier: highestTier,
    riskScore: maxRiskWeight,
    evaluatedFiles,
    highRiskFiles,
    sensitiveKeywordsDetected,
    requiresHumanApproval,
    autoApplyPermitted,
    justification,
  };
}

/**
 * Checks project rate limits to prevent runaway healing loops
 */
export function checkHealingRateLimit(
  projectId: string,
  policy: HealingRateLimitPolicy = DEFAULT_HEALING_RATE_LIMIT_POLICY
): { allowed: boolean; waitSeconds?: number; reason?: string } {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Check consecutive failures
  const failures = consecutiveFailures.get(projectId) || 0;
  if (failures >= policy.maxConsecutiveFailures) {
    const cooldownMs = policy.cooldownMinutesOnFailure * 60 * 1000;
    return {
      allowed: false,
      waitSeconds: Math.ceil(cooldownMs / 1000),
      reason: `Project exceeded max consecutive failures (${failures}). In cooldown for ${policy.cooldownMinutesOnFailure} minutes.`,
    };
  }

  // Check hourly rate
  const existing = (repairTimestamps.get(projectId) || []).filter((ts) => ts > oneHourAgo);
  repairTimestamps.set(projectId, existing);

  if (existing.length >= policy.maxRepairsPerHour) {
    return {
      allowed: false,
      waitSeconds: 300,
      reason: `Project reached maximum rate limit of ${policy.maxRepairsPerHour} automated repairs per hour.`,
    };
  }

  return { allowed: true };
}

/**
 * Records outcome of a healing attempt to update rate limiter state
 */
export function recordHealingAttempt(projectId: string, outcome: 'success' | 'failure'): void {
  const now = Date.now();
  const existing = repairTimestamps.get(projectId) || [];
  existing.push(now);
  repairTimestamps.set(projectId, existing);

  if (outcome === 'failure') {
    const current = consecutiveFailures.get(projectId) || 0;
    consecutiveFailures.set(projectId, current + 1);
  } else {
    consecutiveFailures.set(projectId, 0); // reset on success
  }
}

/**
 * Master gatekeeper decision engine
 */
export function evaluateSelfHealingGate(
  params: {
    projectId: string;
    diffText: string;
    confidenceScore: number;
    mode: SelfHealingMode;
  }
): {
  permitAction: 'auto_apply' | 'draft_pr' | 'manual_review_only' | 'blocked';
  assessment: SelfHealingRiskAssessment;
  rateLimitStatus: { allowed: boolean; reason?: string };
} {
  const rateLimitStatus = checkHealingRateLimit(params.projectId);
  const assessment = assessPatchRisk(params.diffText);

  if (!rateLimitStatus.allowed) {
    return {
      permitAction: 'blocked',
      assessment,
      rateLimitStatus,
    };
  }

  if (params.mode === 'manual_review_only') {
    return {
      permitAction: 'manual_review_only',
      assessment,
      rateLimitStatus,
    };
  }

  // Critical security code requires human review
  if (assessment.overallTier === 'tier4_critical') {
    return {
      permitAction: 'manual_review_only',
      assessment,
      rateLimitStatus,
    };
  }

  // High risk code (backend, prisma, configs) opens draft PR in full autonomy, never silent auto-apply
  if (assessment.overallTier === 'tier3_high') {
    return {
      permitAction: params.mode === 'fully_autonomous' ? 'draft_pr' : 'manual_review_only',
      assessment,
      rateLimitStatus,
    };
  }

  // Tier 1 and Tier 2 safe code
  if (params.confidenceScore >= 80) {
    if (params.mode === 'fully_autonomous') {
      return { permitAction: 'auto_apply', assessment, rateLimitStatus };
    }
    if (params.mode === 'semi_autonomous') {
      return { permitAction: 'auto_apply', assessment, rateLimitStatus };
    }
  }

  return {
    permitAction: 'manual_review_only',
    assessment,
    rateLimitStatus,
  };
}
