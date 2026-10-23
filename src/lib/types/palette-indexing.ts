/**
 * Command Palette Entity Indexing Contracts
 *
 * Defines structured indexing models for fuzzy matching across active projects,
 * recent runs, failing tests, and AI fix proposals.
 */

import type { CommandAction } from './navigation-palette';

export interface ProjectIndexItem {
  id: string;
  name: string;
  description?: string;
  defaultBranch?: string;
  repoUrl?: string;
  activeRunsCount?: number;
  lastRunStatus?: 'passed' | 'failed' | 'running';
  updatedAt: string;
}

export interface RunIndexItem {
  id: string;
  projectId: string;
  projectName?: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  branch: string;
  commitHash?: string;
  testCount: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  createdAt: string;
}

export interface FailingTestIndexItem {
  id: string;
  runId: string;
  projectId: string;
  projectName?: string;
  testName: string;
  suiteName?: string;
  errorMessage: string;
  stackSnippet?: string;
  durationMs: number;
  failedAt: string;
}

export interface ProposalIndexItem {
  id: string;
  runId: string;
  projectId: string;
  projectName?: string;
  testName?: string;
  title: string;
  description: string;
  confidenceScore: number; // 0.0 to 1.0
  targetFile: string;
  diffSummary?: string;
  status: 'proposed' | 'applied' | 'rejected';
  createdAt: string;
}

export interface EntityIndexBundle {
  projects: ProjectIndexItem[];
  runs: RunIndexItem[];
  failingTests: FailingTestIndexItem[];
  proposals: ProposalIndexItem[];
}

export interface EntityMatchResult {
  action: CommandAction;
  score: number;
  matchField: 'title' | 'subtitle' | 'keywords' | 'acronym' | 'metadata';
}
