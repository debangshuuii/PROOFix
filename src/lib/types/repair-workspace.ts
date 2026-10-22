/**
 * PROOFix Ephemeral Workspace Snapshot and Isolation Boundary Schemas
 */

export type WorkspaceIsolationMode = 'copy-on-write' | 'git-worktree' | 'temp-directory';

export interface WorkspaceSecurityPolicy {
  allowedPaths?: string[];
  forbiddenPathPatterns?: string[];
  maxDiskQuotaMb: number;
  maxLifetimeMs: number;
  enforceSymlinkJail: boolean;
  blockNetworkAccess?: boolean;
}

export type IsolationViolationType =
  | 'path-traversal'
  | 'forbidden-write'
  | 'symlink-escape'
  | 'quota-exceeded'
  | 'network-attempt';

export interface IsolationViolation {
  type: IsolationViolationType;
  targetPath: string;
  timestamp: string;
  message: string;
}

export interface EphemeralWorkspaceSnapshot {
  id: string;
  originalRoot: string;
  isolatedPath: string;
  mode: WorkspaceIsolationMode;
  createdAt: string;
  modifiedFiles: string[];
  activeMounts: string[];
  status: 'provisioning' | 'ready' | 'dirty' | 'cleaned' | 'destroyed';
  violations: IsolationViolation[];
}

export interface WorkspaceCleanupResult {
  workspaceId: string;
  isolatedPath: string;
  filesRemoved: number;
  diskFreedBytes: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export const DEFAULT_WORKSPACE_SECURITY_POLICY: WorkspaceSecurityPolicy = {
  forbiddenPathPatterns: [
    '\\.git(/|$)',
    '\\.env(\\.|$)',
    'node_modules(/|$)',
    'id_rsa',
    '\\.ssh(/|$)',
    'credentials',
    '\\.aws(/|$)',
  ],
  maxDiskQuotaMb: 500,
  maxLifetimeMs: 1000 * 60 * 15, // 15 minutes
  enforceSymlinkJail: true,
  blockNetworkAccess: false,
};
