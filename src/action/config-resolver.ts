import fs from 'fs';
import path from 'path';
import { ActionInputs, VerificationProfile } from './validator';
import { TestCategory } from '../lib/types';

export interface ResolvedWorkflowConfig {
  workspaceDir: string;
  profile: VerificationProfile;
  allowedCategories: TestCategory[];
  reportDirectory: string;
  failOnRegression: boolean;
  timeoutMs: number;
  retries: number;
  generateSummary: boolean;
  uploadArtifacts: boolean;
  isCustomReportDir: boolean;
}

/**
 * Maps verification profiles to active test categories, changing actual execution behavior.
 */
export function getCategoriesForProfile(profile: VerificationProfile): TestCategory[] {
  switch (profile) {
    case 'smoke':
      return ['smoke'];
    case 'visual':
      return ['responsive_layout', 'smoke'];
    case 'fast':
      return ['smoke', 'api_health'];
    case 'full':
    default:
      return [
        'smoke',
        'route_discovery',
        'user_flow',
        'form_validation',
        'error_boundary',
        'responsive_layout',
        'api_health',
      ];
  }
}

/**
 * Resolves workflow configuration, validating paths and applying profile filters.
 */
export function resolveWorkflowConfig(inputs: ActionInputs): ResolvedWorkflowConfig {
  const workspaceDir = path.resolve(process.cwd(), inputs.projectPath);

  if (!fs.existsSync(workspaceDir)) {
    throw new Error(
      `Config error: Specified project-path "${inputs.projectPath}" (resolved: "${workspaceDir}") does not exist.`
    );
  }

  const stat = fs.statSync(workspaceDir);
  if (!stat.isDirectory()) {
    throw new Error(
      `Config error: Specified project-path "${inputs.projectPath}" is a file, not a directory.`
    );
  }

  const allowedCategories = getCategoriesForProfile(inputs.verificationProfile);
  const reportDirectory = path.resolve(process.cwd(), inputs.reportOutput);
  const isCustomReportDir = inputs.reportOutput !== 'proofix-reports';

  return {
    workspaceDir,
    profile: inputs.verificationProfile,
    allowedCategories,
    reportDirectory,
    failOnRegression: inputs.failOnRegression,
    timeoutMs: inputs.timeoutMinutes * 60 * 1000,
    retries: inputs.retries,
    generateSummary: inputs.generateSummary,
    uploadArtifacts: inputs.uploadArtifacts,
    isCustomReportDir,
  };
}
