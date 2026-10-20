import fs from 'fs';
import path from 'path';

export interface WorkspaceSnapshot {
  snapshotName: string;
  files: Map<string, string>; // relativePath -> originalContent
  createdAt: string;
}

export interface EphemeralWorkspace {
  id: string;
  workspacePath: string;
  sourcePath: string;
  createdAt: string;
  snapshots: WorkspaceSnapshot[];
}

const WORKSPACE_BASE_DIR = path.join(process.cwd(), 'data', 'workspaces');

/**
 * Ensures workspace path resolves safely within data/workspaces.
 */
function assertValidWorkspacePath(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const baseResolved = path.resolve(WORKSPACE_BASE_DIR);

  if (!resolved.startsWith(baseResolved)) {
    throw new Error(`Security violation: Workspace path "${targetPath}" is outside the authorized sandbox directory.`);
  }
}

/**
 * Creates an ephemeral, isolated workspace deep-copying project files.
 */
export async function createEphemeralWorkspace(
  sourcePath: string,
  sessionId: string = `session_${Date.now()}`
): Promise<EphemeralWorkspace> {
  if (!fs.existsSync(WORKSPACE_BASE_DIR)) {
    fs.mkdirSync(WORKSPACE_BASE_DIR, { recursive: true });
  }

  const workspaceId = `heal_${sessionId}_${Math.random().toString(36).substring(2, 7)}`;
  const workspacePath = path.join(WORKSPACE_BASE_DIR, workspaceId);
  assertValidWorkspacePath(workspacePath);

  fs.mkdirSync(workspacePath, { recursive: true });

  // Copy files excluding node_modules, .git, .next, and large artifacts
  copyDirRecursiveFiltered(sourcePath, workspacePath, [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'data',
  ]);

  return {
    id: workspaceId,
    workspacePath,
    sourcePath,
    createdAt: new Date().toISOString(),
    snapshots: [],
  };
}

/**
 * Recursively copies a directory with an exclusion filter.
 */
function copyDirRecursiveFiltered(
  src: string,
  dest: string,
  excludeNames: string[]
): void {
  if (!fs.existsSync(src)) return;

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeNames.includes(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursiveFiltered(srcPath, destPath, excludeNames);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Takes a snapshot of specific files before applying patch hunks.
 */
export function createWorkspaceSnapshot(
  workspacePath: string,
  relativeFiles: string[],
  snapshotName: string = `snap_${Date.now()}`
): WorkspaceSnapshot {
  assertValidWorkspacePath(workspacePath);
  const files = new Map<string, string>();

  for (const rel of relativeFiles) {
    const fullPath = path.join(workspacePath, rel);
    if (fs.existsSync(fullPath)) {
      files.set(rel, fs.readFileSync(fullPath, 'utf8'));
    } else {
      files.set(rel, ''); // File did not exist (was created by patch)
    }
  }

  return {
    snapshotName,
    files,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Atomically rolls back workspace files to snapshot state.
 */
export function rollbackWorkspace(
  workspacePath: string,
  snapshot: WorkspaceSnapshot
): void {
  assertValidWorkspacePath(workspacePath);

  for (const [rel, content] of snapshot.files.entries()) {
    const fullPath = path.join(workspacePath, rel);
    if (content === '') {
      // File was originally non-existent, delete it
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } else {
      // Restore original content
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

/**
 * Safely removes ephemeral workspace from disk.
 */
export async function cleanupEphemeralWorkspace(workspacePath: string): Promise<void> {
  assertValidWorkspacePath(workspacePath);

  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
}
