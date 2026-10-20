import path from 'path';
import type {
  SelfHealingConfig,
  SelfHealingPolicyCheckResult,
} from '../types/self-healing.ts';
import type { FixProposal } from '../types/proposal.ts';

export const DEFAULT_SELF_HEALING_CONFIG: SelfHealingConfig = {
  enabled: false, // Safe default: must be explicitly enabled
  mode: 'manual_review_only',
  maxIterations: 3,
  minConfidenceScore: 75,
  allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.html', '.md'],
  protectedFilePatterns: [
    '.env',
    '.env.*',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'Dockerfile',
    'docker-compose*.yml',
    '.git/**',
    'node_modules/**',
  ],
  requireGreenRegressionSuite: true,
  createDraftPullRequest: true,
  targetBranchPrefix: 'proofix/heal-',
  githubTokenEnvVar: 'GITHUB_TOKEN',
};

/**
 * Returns clean default self-healing configuration.
 */
export function getDefaultSelfHealingConfig(): SelfHealingConfig {
  return { ...DEFAULT_SELF_HEALING_CONFIG };
}

/**
 * Validates and clamps a user-provided self-healing configuration.
 */
export function validateSelfHealingConfig(raw: Partial<SelfHealingConfig> = {}): {
  valid: boolean;
  config: SelfHealingConfig;
  errors: string[];
} {
  const errors: string[] = [];
  const base = getDefaultSelfHealingConfig();

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled;

  const validModes = ['manual_review_only', 'semi_autonomous', 'fully_autonomous'];
  const mode = raw.mode && validModes.includes(raw.mode) ? raw.mode : base.mode;
  if (raw.mode && !validModes.includes(raw.mode)) {
    errors.push(`Invalid mode "${raw.mode}". Allowed modes: ${validModes.join(', ')}`);
  }

  // Clamped iterations: 1 to 5
  let maxIterations = base.maxIterations;
  if (typeof raw.maxIterations === 'number') {
    if (raw.maxIterations < 1 || raw.maxIterations > 5) {
      errors.push('maxIterations must be between 1 and 5.');
    }
    maxIterations = Math.max(1, Math.min(5, Math.floor(raw.maxIterations)));
  }

  // Clamped confidence: 50 to 100
  let minConfidenceScore = base.minConfidenceScore;
  if (typeof raw.minConfidenceScore === 'number') {
    if (raw.minConfidenceScore < 50 || raw.minConfidenceScore > 100) {
      errors.push('minConfidenceScore must be between 50 and 100.');
    }
    minConfidenceScore = Math.max(50, Math.min(100, raw.minConfidenceScore));
  }

  const allowedFileExtensions = Array.isArray(raw.allowedFileExtensions) && raw.allowedFileExtensions.length > 0
    ? raw.allowedFileExtensions.map((e) => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`))
    : base.allowedFileExtensions;

  const protectedFilePatterns = Array.isArray(raw.protectedFilePatterns) && raw.protectedFilePatterns.length > 0
    ? raw.protectedFilePatterns
    : base.protectedFilePatterns;

  const requireGreenRegressionSuite = typeof raw.requireGreenRegressionSuite === 'boolean'
    ? raw.requireGreenRegressionSuite
    : base.requireGreenRegressionSuite;

  const createDraftPullRequest = typeof raw.createDraftPullRequest === 'boolean'
    ? raw.createDraftPullRequest
    : base.createDraftPullRequest;

  const targetBranchPrefix = typeof raw.targetBranchPrefix === 'string' && raw.targetBranchPrefix.trim() !== ''
    ? raw.targetBranchPrefix.trim().replace(/[^a-zA-Z0-9_\-\/]/g, '')
    : base.targetBranchPrefix;

  const githubTokenEnvVar = typeof raw.githubTokenEnvVar === 'string' && raw.githubTokenEnvVar.trim() !== ''
    ? raw.githubTokenEnvVar.trim()
    : base.githubTokenEnvVar;

  return {
    valid: errors.length === 0,
    config: {
      enabled,
      mode,
      maxIterations,
      minConfidenceScore,
      allowedFileExtensions,
      protectedFilePatterns,
      requireGreenRegressionSuite,
      createDraftPullRequest,
      targetBranchPrefix,
      githubTokenEnvVar,
    },
    errors,
  };
}

/**
 * Checks if a single file path is eligible for self-healing repair.
 */
export function isPathEligibleForRepair(
  filePath: string,
  config: SelfHealingConfig = DEFAULT_SELF_HEALING_CONFIG
): { eligible: boolean; reason?: string } {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // 1. Path traversal mitigation
  if (normalized.includes('..') || path.isAbsolute(filePath)) {
    return { eligible: false, reason: 'Path traversal or absolute path is strictly prohibited.' };
  }

  // 2. Protected file check
  const fileName = path.basename(normalized);
  for (const pattern of config.protectedFilePatterns) {
    if (pattern.endsWith('/**')) {
      const dirPrefix = pattern.slice(0, -3);
      if (normalized.startsWith(dirPrefix) || normalized.includes(`/${dirPrefix}`)) {
        return { eligible: false, reason: `Target path matches protected directory pattern: "${pattern}".` };
      }
    } else if (pattern.includes('*')) {
      const prefix = pattern.replace(/\*/g, '');
      if (fileName.startsWith(prefix)) {
        return { eligible: false, reason: `File matches protected pattern: "${pattern}".` };
      }
    } else if (fileName === pattern || normalized === pattern) {
      return { eligible: false, reason: `Target file is protected from automated edits: "${pattern}".` };
    }
  }

  // 3. Allowed extensions check
  const ext = path.extname(normalized).toLowerCase();
  if (!config.allowedFileExtensions.includes(ext)) {
    return {
      eligible: false,
      reason: `File extension "${ext}" is not in the allowed list of repairable extensions (${config.allowedFileExtensions.join(', ')}).`,
    };
  }

  return { eligible: true };
}

/**
 * Evaluates whether a proposed fix meets policy gates for autonomous application.
 */
export function evaluateSelfHealingEligibility(
  proposal: FixProposal,
  config: SelfHealingConfig = DEFAULT_SELF_HEALING_CONFIG
): SelfHealingPolicyCheckResult {
  const reasons: string[] = [];

  // Check 1: Feature master switch
  if (!config.enabled && config.mode !== 'manual_review_only') {
    reasons.push('Autonomous self-healing is disabled in project configuration.');
  }

  // Check 2: Confidence score
  if (proposal.confidenceScore < config.minConfidenceScore) {
    reasons.push(
      `Proposal confidence score (${proposal.confidenceScore}%) is below minimum required threshold (${config.minConfidenceScore}%).`
    );
  }

  // Check 3: Affected files eligibility
  if (!proposal.affectedFiles || proposal.affectedFiles.length === 0) {
    reasons.push('Proposal does not specify any affected files.');
  } else {
    for (const file of proposal.affectedFiles) {
      const check = isPathEligibleForRepair(file, config);
      if (!check.eligible) {
        reasons.push(`File "${file}" is ineligible for self-healing: ${check.reason}`);
      }
    }
  }

  // Check 4: Proposal validity status
  if (proposal.validationStatus === 'invalid' || proposal.validationStatus === 'rejected') {
    reasons.push(`Proposal validation status is "${proposal.validationStatus}".`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}
