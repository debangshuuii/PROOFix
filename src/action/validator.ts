import fs from 'fs';
import path from 'path';

export type VerificationProfile = 'smoke' | 'full' | 'visual' | 'fast';

export interface ActionInputs {
  projectPath: string;
  verificationProfile: VerificationProfile;
  reportOutput: string;
  failOnRegression: boolean;
  timeoutMinutes: number;
  retries: number;
  generateSummary: boolean;
  uploadArtifacts: boolean;
  githubToken?: string;
}

export interface ValidationResult {
  valid: boolean;
  inputs?: ActionInputs;
  errors: string[];
}

const VALID_PROFILES: VerificationProfile[] = ['smoke', 'full', 'visual', 'fast'];

/**
 * Validates raw string inputs from GitHub Actions environment against schema constraints.
 */
export function validateActionInputs(raw: Record<string, string | undefined>): ValidationResult {
  const errors: string[] = [];

  // project-path
  const projectPath = raw['project-path'] ?? raw['projectPath'] ?? '.';
  if (typeof projectPath !== 'string' || projectPath.trim() === '') {
    errors.push('Input "project-path" must be a non-empty string.');
  }

  // verification-profile
  const profileRaw = (raw['verification-profile'] ?? raw['verificationProfile'] ?? 'full').toLowerCase().trim();
  if (!VALID_PROFILES.includes(profileRaw as VerificationProfile)) {
    errors.push(
      `Invalid "verification-profile": "${profileRaw}". Must be one of: ${VALID_PROFILES.join(', ')}.`
    );
  }
  const verificationProfile = (VALID_PROFILES.includes(profileRaw as VerificationProfile)
    ? profileRaw
    : 'full') as VerificationProfile;

  // report-output
  const reportOutput = raw['report-output'] ?? raw['reportOutput'] ?? 'proofix-reports';
  if (typeof reportOutput !== 'string' || reportOutput.trim() === '') {
    errors.push('Input "report-output" must be a valid directory path string.');
  }

  // fail-on-regression
  const failOnRegStr = (raw['fail-on-regression'] ?? raw['failOnRegression'] ?? 'true').toLowerCase().trim();
  if (failOnRegStr !== 'true' && failOnRegStr !== 'false') {
    errors.push('Input "fail-on-regression" must be a boolean string ("true" or "false").');
  }
  const failOnRegression = failOnRegStr !== 'false';

  // timeout-minutes
  const timeoutStr = raw['timeout-minutes'] ?? raw['timeoutMinutes'] ?? '15';
  const timeoutMinutes = parseInt(timeoutStr, 10);
  if (isNaN(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 120) {
    errors.push('Input "timeout-minutes" must be an integer between 1 and 120.');
  }

  // retries
  const retriesStr = raw['retries'] ?? '2';
  const retries = parseInt(retriesStr, 10);
  if (isNaN(retries) || retries < 0 || retries > 5) {
    errors.push('Input "retries" must be an integer between 0 and 5.');
  }

  // generate-summary
  const summaryStr = (raw['generate-summary'] ?? raw['generateSummary'] ?? 'true').toLowerCase().trim();
  const generateSummary = summaryStr !== 'false';

  // upload-artifacts
  const artifactsStr = (raw['upload-artifacts'] ?? raw['uploadArtifacts'] ?? 'true').toLowerCase().trim();
  const uploadArtifacts = artifactsStr !== 'false';

  // github-token
  const githubToken = raw['github-token'] ?? raw['githubToken'] ?? process.env.GITHUB_TOKEN;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    inputs: {
      projectPath,
      verificationProfile,
      reportOutput,
      failOnRegression,
      timeoutMinutes,
      retries,
      generateSummary,
      uploadArtifacts,
      githubToken: githubToken || undefined,
    },
  };
}

/**
 * Validates that an action.yml file exists and conforms to GitHub Actions specification.
 */
export function validateActionYml(filePath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`action.yml file not found at: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify mandatory sections
  const requiredKeys = ['name:', 'description:', 'inputs:', 'outputs:', 'runs:'];
  for (const k of requiredKeys) {
    if (!content.includes(k)) {
      errors.push(`action.yml is missing required top-level key: ${k}`);
    }
  }

  // Verify key inputs documented
  const documentedInputs = ['project-path:', 'verification-profile:', 'report-output:', 'timeout-minutes:'];
  for (const inp of documentedInputs) {
    if (!content.includes(inp)) {
      errors.push(`action.yml missing documented input definition: ${inp}`);
    }
  }

  // Verify key outputs documented
  const documentedOutputs = ['run-id:', 'status:', 'exit-code:', 'summary-markdown:'];
  for (const out of documentedOutputs) {
    if (!content.includes(out)) {
      errors.push(`action.yml missing documented output definition: ${out}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
