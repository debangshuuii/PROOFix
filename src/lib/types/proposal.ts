export type FixProposalValidationStatus =
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'rejected'
  | 'applied'
  | 'verified'
  | 'regression_detected'
  | 'reverted';

export interface FixProposal {
  id: string;
  projectId: string;
  runId: string;
  failureId: string;
  commitSha: string;
  explanation: string;
  proposedChanges: string; // Unified diff format
  affectedFiles: string[];
  confidenceScore: number; // 0 - 100
  validationStatus: FixProposalValidationStatus;
  validationErrors?: string[];
  verificationOutcome?: {
    status: 'passed' | 'failed' | 'partial';
    summary: string;
    durationMs?: number;
    testedAt: string;
  };
  appliedWorkspacePath?: string;
  gitBranch?: string;
  pullRequestUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  proposal?: FixProposal;
}

const COMMIT_SHA_REGEX = /^[0-9a-f]{7,40}$/i;

/**
 * Validates untrusted fix proposal payloads against strict schema rules.
 * Rejects invalid fields, out-of-bound scores, path traversals, and malformed diffs.
 */
export function validateFixProposal(input: any): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be a valid JSON object.'] };
  }

  // failureId
  if (!input.failureId || typeof input.failureId !== 'string' || input.failureId.trim() === '') {
    errors.push('Field "failureId" is required and must be a non-empty string.');
  }

  // commitSha
  if (!input.commitSha || typeof input.commitSha !== 'string' || !COMMIT_SHA_REGEX.test(input.commitSha.trim())) {
    errors.push('Field "commitSha" must be a valid git commit SHA (7 to 40 hexadecimal characters).');
  }

  // explanation
  if (!input.explanation || typeof input.explanation !== 'string' || input.explanation.trim().length < 10) {
    errors.push('Field "explanation" is required and must be at least 10 characters describing the fix.');
  }

  // proposedChanges (unified diff)
  if (!input.proposedChanges || typeof input.proposedChanges !== 'string') {
    errors.push('Field "proposedChanges" is required and must contain a unified diff string.');
  } else {
    const diff = input.proposedChanges;
    if (!diff.includes('--- ') || !diff.includes('+++ ') || !diff.includes('@@')) {
      errors.push('Field "proposedChanges" must be in standard unified diff format (containing ---, +++, and @@ hunk headers).');
    }
  }

  // affectedFiles
  if (!Array.isArray(input.affectedFiles) || input.affectedFiles.length === 0) {
    errors.push('Field "affectedFiles" must be a non-empty array of file paths.');
  } else {
    for (const file of input.affectedFiles) {
      if (typeof file !== 'string' || file.trim() === '') {
        errors.push('Every entry in "affectedFiles" must be a non-empty string.');
      } else if (file.includes('..') || file.startsWith('/') || /^[a-zA-Z]:/.test(file)) {
        errors.push(`File path "${file}" in affectedFiles contains path traversal or absolute location.`);
      }
    }
  }

  // confidenceScore
  if (
    typeof input.confidenceScore !== 'number' ||
    isNaN(input.confidenceScore) ||
    input.confidenceScore < 0 ||
    input.confidenceScore > 100
  ) {
    errors.push('Field "confidenceScore" must be a number between 0 and 100.');
  }

  // validationStatus
  const allowedStatuses: FixProposalValidationStatus[] = [
    'pending',
    'valid',
    'invalid',
    'rejected',
    'applied',
    'verified',
    'regression_detected',
    'reverted',
  ];
  if (input.validationStatus && !allowedStatuses.includes(input.validationStatus)) {
    errors.push(`Field "validationStatus" must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const now = new Date().toISOString();
  const proposal: FixProposal = {
    id: input.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    projectId: input.projectId || 'unknown_project',
    runId: input.runId || 'unknown_run',
    failureId: input.failureId.trim(),
    commitSha: input.commitSha.trim().toLowerCase(),
    explanation: input.explanation.trim(),
    proposedChanges: input.proposedChanges.trim(),
    affectedFiles: input.affectedFiles.map((f: string) => f.trim()),
    confidenceScore: Math.round(input.confidenceScore),
    validationStatus: input.validationStatus || 'valid',
    validationErrors: [],
    verificationOutcome: input.verificationOutcome,
    appliedWorkspacePath: input.appliedWorkspacePath,
    gitBranch: input.gitBranch,
    pullRequestUrl: input.pullRequestUrl,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  return { valid: true, errors: [], proposal };
}
