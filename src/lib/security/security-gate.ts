import type {
  SecurityGateEvaluation,
  SecurityGatePolicy,
  SecretFinding,
  VulnerabilityFinding,
} from '../types/security.ts';

export const DEFAULT_SECURITY_GATE_POLICY: Readonly<SecurityGatePolicy> = Object.freeze({
  enabled: true,
  blockOnVulnerabilitySeverity: 'critical',
  blockOnSecrets: true,
  allowIncompleteScans: false,
  ignoredAdvisoryIds: [],
  ignoredSecretRules: [],
});

export function validateSecurityGatePolicy(raw?: unknown): SecurityGatePolicy {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SECURITY_GATE_POLICY };
  }

  const p = raw as Record<string, any>;
  const validSeverities = ['critical', 'high', 'medium', 'none'] as const;

  const severity = validSeverities.includes(p.blockOnVulnerabilitySeverity)
    ? p.blockOnVulnerabilitySeverity
    : DEFAULT_SECURITY_GATE_POLICY.blockOnVulnerabilitySeverity;

  return {
    enabled: p.enabled !== undefined ? Boolean(p.enabled) : DEFAULT_SECURITY_GATE_POLICY.enabled,
    blockOnVulnerabilitySeverity: severity,
    blockOnSecrets: p.blockOnSecrets !== undefined ? Boolean(p.blockOnSecrets) : DEFAULT_SECURITY_GATE_POLICY.blockOnSecrets,
    allowIncompleteScans: p.allowIncompleteScans !== undefined ? Boolean(p.allowIncompleteScans) : DEFAULT_SECURITY_GATE_POLICY.allowIncompleteScans,
    ignoredAdvisoryIds: Array.isArray(p.ignoredAdvisoryIds) ? p.ignoredAdvisoryIds : [],
    ignoredSecretRules: Array.isArray(p.ignoredSecretRules) ? p.ignoredSecretRules : [],
  };
}

const SEVERITY_LEVELS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Evaluates security gate policies deterministically.
 * "Done when: policy behavior is deterministic and incomplete scans are not falsely reported as clean."
 */
export function evaluateSecurityGate(
  policyInput: SecurityGatePolicy | undefined,
  data: {
    vulnerabilities: VulnerabilityFinding[];
    secrets: SecretFinding[];
    uncheckableCount?: number;
    scanErrors?: string[];
  }
): SecurityGateEvaluation {
  const policy = validateSecurityGatePolicy(policyInput);
  const evaluatedAt = new Date().toISOString();

  // If policy is disabled, proceed without blocking
  if (!policy.enabled) {
    return {
      passed: true,
      blocked: false,
      action: 'proceed',
      reasons: ['Security gate policy is disabled by project configuration.'],
      isIncomplete: false,
      totalVulnerabilities: data.vulnerabilities.length,
      blockingVulnerabilitiesCount: 0,
      totalSecrets: data.secrets.length,
      blockingSecretsCount: 0,
      evaluatedAt,
    };
  }

  const reasons: string[] = [];
  const ignoredAdvisories = new Set(policy.ignoredAdvisoryIds || []);
  const ignoredSecrets = new Set(policy.ignoredSecretRules || []);

  // 1. Evaluate Vulnerabilities
  let blockingVulnCount = 0;
  const policyThreshold = policy.blockOnVulnerabilitySeverity;

  for (const v of data.vulnerabilities) {
    if (ignoredAdvisories.has(v.advisoryId)) {
      continue;
    }

    if (policyThreshold !== 'none') {
      const requiredRank = SEVERITY_LEVELS[policyThreshold] || 4;
      const findingRank = SEVERITY_LEVELS[v.severity] || 0;

      if (findingRank >= requiredRank) {
        blockingVulnCount++;
        reasons.push(
          `Blocking: ${v.severity.toUpperCase()} severity vulnerability in ${v.packageName}@${v.packageVersion} (${v.advisoryId}) exceeds "${policyThreshold}" gate threshold.`
        );
      } else {
        reasons.push(
          `Warning: ${v.severity.toUpperCase()} severity in ${v.packageName}@${v.packageVersion} (${v.advisoryId}) permitted under "${policyThreshold}" gate.`
        );
      }
    }
  }

  // 2. Evaluate Secrets
  let blockingSecretsCount = 0;
  for (const s of data.secrets) {
    if (ignoredSecrets.has(s.detectorType)) {
      continue;
    }

    if (policy.blockOnSecrets) {
      blockingSecretsCount++;
      reasons.push(
        `Blocking: Exposed secret detected (${s.detectorType}) at ${s.filePath}:${s.lineNumber}.`
      );
    } else {
      reasons.push(
        `Warning: Secret detected (${s.detectorType}) at ${s.filePath}:${s.lineNumber} (secrets policy set to non-blocking).`
      );
    }
  }

  // 3. Evaluate Incomplete Scans
  // "Done when: policy behavior is deterministic and incomplete scans are not falsely reported as clean."
  const uncheckableCount = data.uncheckableCount || 0;
  const scanErrorsCount = (data.scanErrors || []).length;
  const isIncomplete = uncheckableCount > 0 || scanErrorsCount > 0;

  if (isIncomplete && !policy.allowIncompleteScans) {
    if (scanErrorsCount > 0) {
      reasons.push(
        `Blocking: Security scan encountered ${scanErrorsCount} scanner error(s). Policy forbids declaring incomplete scans clean.`
      );
    }
    if (uncheckableCount > 0) {
      reasons.push(
        `Warning: ${uncheckableCount} package(s) could not be verified against the vulnerability database.`
      );
    }
  }

  // Determine final action
  const hasBlockingFindings = blockingVulnCount > 0 || blockingSecretsCount > 0;
  const hasBlockingIncomplete = isIncomplete && !policy.allowIncompleteScans && scanErrorsCount > 0;

  const blocked = hasBlockingFindings || hasBlockingIncomplete;
  const passed = !blocked;

  let action: 'proceed' | 'warn' | 'block' = 'proceed';
  if (blocked) {
    action = 'block';
  } else if (reasons.length > 0 || isIncomplete) {
    action = 'warn';
  }

  return {
    passed,
    blocked,
    action,
    reasons,
    isIncomplete,
    totalVulnerabilities: data.vulnerabilities.length,
    blockingVulnerabilitiesCount: blockingVulnCount,
    totalSecrets: data.secrets.length,
    blockingSecretsCount: blockingSecretsCount,
    evaluatedAt,
  };
}
