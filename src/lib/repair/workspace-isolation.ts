import fs from 'fs';
import path from 'path';
import { parseUnifiedDiff, validatePatchIntegrity } from './patch-validator';

const WORKSPACES_BASE = path.join(process.cwd(), 'data', 'workspaces');

/**
 * Creates an isolated disposable workspace directory from a source repository.
 * Original checkout remains completely immutable.
 */
export async function createDisposableWorkspace(
  sourceDir: string,
  proposalId: string
): Promise<string> {
  const sanitizedId = proposalId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const targetDir = path.join(WORKSPACES_BASE, `disposable_${sanitizedId}`);

  if (!fs.existsSync(WORKSPACES_BASE)) {
    fs.mkdirSync(WORKSPACES_BASE, { recursive: true });
  }

  // If already exists, clear it
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  fs.mkdirSync(targetDir, { recursive: true });

  // Fast recursive copy excluding bulky build directories
  copyDirRecursive(sourceDir, targetDir, ['node_modules', '.git', '.next', 'out', 'dist']);

  // Link node_modules if present in sourceDir for zero-overhead dependencies
  const srcNodeModules = path.join(sourceDir, 'node_modules');
  const targetNodeModules = path.join(targetDir, 'node_modules');

  if (fs.existsSync(srcNodeModules) && !fs.existsSync(targetNodeModules)) {
    try {
      if (process.platform === 'win32') {
        fs.symlinkSync(srcNodeModules, targetNodeModules, 'junction');
      } else {
        fs.symlinkSync(srcNodeModules, targetNodeModules, 'dir');
      }
    } catch {
      // Fallback: If symlink permission denied on Windows without dev mode, continue gracefully
    }
  }

  return targetDir;
}

function copyDirRecursive(src: string, dest: string, ignoreNames: string[]) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const ent of entries) {
    if (ignoreNames.includes(ent.name)) continue;

    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);

    if (ent.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath, ignoreNames);
    } else if (ent.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Applies a validated unified diff to files inside the disposable workspace.
 * If application encounters any mismatch, rolls back all modified files atomically.
 */
export async function applyPatchToWorkspace(
  workspaceDir: string,
  diffText: string
): Promise<{ success: boolean; error?: string; modifiedFiles: string[] }> {
  // Validate patch first
  const validation = validatePatchIntegrity(diffText, workspaceDir);
  if (!validation.valid) {
    return {
      success: false,
      error: `Patch validation failed: ${validation.errors.join('; ')}`,
      modifiedFiles: [],
    };
  }

  const fileBackups = new Map<string, string>();
  const modifiedFiles: string[] = [];

  try {
    for (const filePatch of validation.patches) {
      const relPath = filePatch.newPath || filePatch.oldPath;
      const targetFilePath = path.resolve(workspaceDir, relPath);

      if (!fs.existsSync(targetFilePath)) {
        throw new Error(`Target file does not exist: ${relPath}`);
      }

      const originalContent = fs.readFileSync(targetFilePath, 'utf-8');
      fileBackups.set(targetFilePath, originalContent);

      let targetLines = originalContent.split('\n');

      // Sort hunks descending by oldStart to preserve line indices during modification
      const sortedHunks = [...filePatch.hunks].sort((a, b) => b.oldStart - a.oldStart);

      for (const hunk of sortedHunks) {
        const removeCount = hunk.lines.filter((l) => l.startsWith('-') || l.startsWith(' ')).length;
        const newLines = hunk.lines
          .filter((l) => l.startsWith('+') || l.startsWith(' '))
          .map((l) => l.substring(1));

        // Line 1-based index in hunk.oldStart -> 0-based index
        const spliceIndex = Math.max(0, hunk.oldStart - 1);
        targetLines.splice(spliceIndex, removeCount, ...newLines);
      }

      fs.writeFileSync(targetFilePath, targetLines.join('\n'), 'utf-8');
      modifiedFiles.push(relPath);
    }

    return { success: true, modifiedFiles };
  } catch (err: any) {
    // Atomic rollback: restore all original file contents
    for (const [filePath, backupContent] of fileBackups.entries()) {
      try {
        fs.writeFileSync(filePath, backupContent, 'utf-8');
      } catch {}
    }

    return {
      success: false,
      error: `Patch application failed and was rolled back: ${err.message}`,
      modifiedFiles: [],
    };
  }
}

/**
 * Removes the disposable workspace directory.
 */
export async function cleanupDisposableWorkspace(workspaceDir: string): Promise<void> {
  if (workspaceDir && workspaceDir.includes('disposable_') && fs.existsSync(workspaceDir)) {
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch {}
  }
}
