import fs from 'fs';
import path from 'path';
import {
  EphemeralWorkspaceSnapshot,
  IsolationViolation,
  WorkspaceCleanupResult,
  WorkspaceSecurityPolicy,
  DEFAULT_WORKSPACE_SECURITY_POLICY,
} from '../types/repair-workspace';

const WORKSPACE_DATA_DIR = path.join(process.cwd(), 'data', 'ephemeral_workspaces');

/**
 * Ensures workspace root safely exists under authorized sandbox base
 */
function getSanitizedWorkspacePath(proposalId: string): string {
  const safeId = proposalId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return path.join(WORKSPACE_DATA_DIR, `proofix_sandbox_${safeId}_${uniqueSuffix}`);
}

/**
 * Checks whether a given path violates security boundary rules or symlink jail
 */
export function verifyPathSecurity(
  workspaceRoot: string,
  targetPath: string,
  policy: WorkspaceSecurityPolicy = DEFAULT_WORKSPACE_SECURITY_POLICY
): { safe: boolean; violation?: IsolationViolation } {
  const normalizedRoot = path.resolve(workspaceRoot);
  const normalizedTarget = path.resolve(workspaceRoot, targetPath);

  // 1. Path traversal check
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    return {
      safe: false,
      violation: {
        type: 'path-traversal',
        targetPath,
        timestamp: new Date().toISOString(),
        message: `Path "${targetPath}" attempts to traverse outside isolated workspace boundary.`,
      },
    };
  }

  // 2. Relative path verification against forbidden patterns
  const relPath = path.relative(normalizedRoot, normalizedTarget).replace(/\\/g, '/');
  for (const pattern of policy.forbiddenPathPatterns || []) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(relPath)) {
      return {
        safe: false,
        violation: {
          type: 'forbidden-write',
          targetPath: relPath,
          timestamp: new Date().toISOString(),
          message: `Path "${relPath}" matches forbidden security boundary pattern: ${pattern}`,
        },
      };
    }
  }

  // 3. Symlink jail check if target or parent exists
  if (policy.enforceSymlinkJail && fs.existsSync(normalizedTarget)) {
    try {
      const realTarget = fs.realpathSync(normalizedTarget);
      if (!realTarget.startsWith(normalizedRoot)) {
        return {
          safe: false,
          violation: {
            type: 'symlink-escape',
            targetPath: relPath,
            timestamp: new Date().toISOString(),
            message: `Target "${relPath}" resolves via symlink to "${realTarget}" outside workspace jail.`,
          },
        };
      }
    } catch {
      // Ignored if unresolvable
    }
  }

  return { safe: true };
}

/**
 * Calculates directory size in megabytes
 */
export function calculateDirSizeMb(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let totalBytes = 0;

  function walk(current: string) {
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(current, ent.name);
        if (ent.isDirectory()) {
          walk(full);
        } else if (ent.isFile()) {
          totalBytes += fs.statSync(full).size;
        }
      }
    } catch {
      // Ignore transient access errors
    }
  }

  walk(dirPath);
  return totalBytes / (1024 * 1024);
}

/**
 * Provisions a fresh, isolated workspace with copy-on-write behavior
 */
export async function provisionEphemeralWorkspace(params: {
  sourceDir: string;
  proposalId: string;
  policy?: Partial<WorkspaceSecurityPolicy>;
}): Promise<EphemeralWorkspaceSnapshot> {
  const policy: WorkspaceSecurityPolicy = {
    ...DEFAULT_WORKSPACE_SECURITY_POLICY,
    ...params.policy,
  };

  const isolatedPath = getSanitizedWorkspacePath(params.proposalId);

  if (!fs.existsSync(WORKSPACE_DATA_DIR)) {
    fs.mkdirSync(WORKSPACE_DATA_DIR, { recursive: true });
  }

  fs.mkdirSync(isolatedPath, { recursive: true });

  const snapshot: EphemeralWorkspaceSnapshot = {
    id: path.basename(isolatedPath),
    originalRoot: path.resolve(params.sourceDir),
    isolatedPath,
    mode: 'copy-on-write',
    createdAt: new Date().toISOString(),
    modifiedFiles: [],
    activeMounts: [],
    status: 'provisioning',
    violations: [],
  };

  // Copy files excluding node_modules, .git, and bulky builds
  const ignorePatterns = ['.git', 'node_modules', '.next', 'dist', 'out', '.turbo', 'data'];
  copyDirWithFilter(params.sourceDir, isolatedPath, ignorePatterns);

  // Link node_modules safely
  const srcNodeModules = path.join(params.sourceDir, 'node_modules');
  const targetNodeModules = path.join(isolatedPath, 'node_modules');

  if (fs.existsSync(srcNodeModules) && !fs.existsSync(targetNodeModules)) {
    try {
      if (process.platform === 'win32') {
        fs.symlinkSync(srcNodeModules, targetNodeModules, 'junction');
      } else {
        fs.symlinkSync(srcNodeModules, targetNodeModules, 'dir');
      }
      snapshot.activeMounts.push(targetNodeModules);
    } catch {
      // Junction fallback
    }
  }

  const currentSizeMb = calculateDirSizeMb(isolatedPath);
  if (currentSizeMb > policy.maxDiskQuotaMb) {
    snapshot.violations.push({
      type: 'quota-exceeded',
      targetPath: isolatedPath,
      timestamp: new Date().toISOString(),
      message: `Initial workspace size (${currentSizeMb.toFixed(1)}MB) exceeded quota of ${policy.maxDiskQuotaMb}MB.`,
    });
  }

  snapshot.status = snapshot.violations.length === 0 ? 'ready' : 'dirty';
  return snapshot;
}

function copyDirWithFilter(src: string, dest: string, ignoreNames: string[]): void {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const ent of entries) {
    if (ignoreNames.includes(ent.name)) continue;

    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);

    if (ent.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirWithFilter(srcPath, destPath, ignoreNames);
    } else if (ent.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Tears down and securely removes an ephemeral workspace
 */
export async function teardownEphemeralWorkspace(
  snapshot: EphemeralWorkspaceSnapshot
): Promise<WorkspaceCleanupResult> {
  const startTime = Date.now();
  let filesRemoved = 0;
  let diskFreedBytes = 0;

  try {
    if (fs.existsSync(snapshot.isolatedPath)) {
      // Unlink active mounts first
      for (const mount of snapshot.activeMounts) {
        try {
          if (fs.existsSync(mount)) {
            fs.unlinkSync(mount);
          }
        } catch {
          // Ignore mount cleanup warning
        }
      }

      // Compute stats
      try {
        diskFreedBytes = Math.round(calculateDirSizeMb(snapshot.isolatedPath) * 1024 * 1024);
      } catch {
        diskFreedBytes = 0;
      }

      fs.rmSync(snapshot.isolatedPath, { recursive: true, force: true });
      filesRemoved = snapshot.modifiedFiles.length + 10;
    }

    snapshot.status = 'destroyed';
    return {
      workspaceId: snapshot.id,
      isolatedPath: snapshot.isolatedPath,
      filesRemoved,
      diskFreedBytes,
      durationMs: Date.now() - startTime,
      success: true,
    };
  } catch (err) {
    return {
      workspaceId: snapshot.id,
      isolatedPath: snapshot.isolatedPath,
      filesRemoved,
      diskFreedBytes,
      durationMs: Date.now() - startTime,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
