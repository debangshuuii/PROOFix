import fs from 'fs';
import path from 'path';

export interface ParsedHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ParsedFilePatch {
  oldPath: string;
  newPath: string;
  hunks: ParsedHunk[];
}

export interface PatchValidationReport {
  valid: boolean;
  errors: string[];
  patches: ParsedFilePatch[];
}

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.md',
  '.svg',
]);

const FORBIDDEN_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'package-lock.json',
]);

/**
 * Parses a standard unified diff string into structured file patches and hunks.
 */
export function parseUnifiedDiff(diffText: string): ParsedFilePatch[] {
  const patches: ParsedFilePatch[] = [];
  const lines = diffText.split('\n');

  let currentPatch: ParsedFilePatch | null = null;
  let currentHunk: ParsedHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('--- ')) {
      const oldPath = line.substring(4).trim().replace(/^[ab]\//, '');
      currentPatch = {
        oldPath,
        newPath: '',
        hunks: [],
      };
      currentHunk = null;
    } else if (line.startsWith('+++ ') && currentPatch) {
      currentPatch.newPath = line.substring(4).trim().replace(/^[ab]\//, '');
      patches.push(currentPatch);
    } else if (line.startsWith('@@ ') && currentPatch) {
      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldLines: match[2] ? parseInt(match[2], 10) : 1,
          newStart: parseInt(match[3], 10),
          newLines: match[4] ? parseInt(match[4], 10) : 1,
          lines: [],
        };
        currentPatch.hunks.push(currentHunk);
      }
    } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '')) {
      currentHunk.lines.push(line);
    }
  }

  return patches;
}

/**
 * Strictly validates a patch against security constraints, path traversal,
 * file-type allowlists, and line-level context match against the repository.
 */
export function validatePatchIntegrity(
  diffText: string,
  repositoryRoot: string
): PatchValidationReport {
  const errors: string[] = [];

  if (!diffText || typeof diffText !== 'string' || diffText.trim() === '') {
    return { valid: false, errors: ['Patch content is empty.'], patches: [] };
  }

  const patches = parseUnifiedDiff(diffText);

  if (patches.length === 0) {
    return {
      valid: false,
      errors: ['No valid unified diff file headers (--- / +++) found.'],
      patches: [],
    };
  }

  const normalizedRepoRoot = path.resolve(repositoryRoot);

  for (const patch of patches) {
    const targetPath = patch.newPath || patch.oldPath;

    // 1. Path traversal checks
    if (!targetPath) {
      errors.push('Patch contains file header with missing path.');
      continue;
    }

    if (
      targetPath.startsWith('/') ||
      targetPath.startsWith('\\') ||
      /^[a-zA-Z]:/.test(targetPath) ||
      targetPath.includes('..')
    ) {
      errors.push(`Security error: Target path "${targetPath}" attempts path traversal or specifies an absolute path.`);
      continue;
    }

    const fullPath = path.resolve(normalizedRepoRoot, targetPath);
    if (!fullPath.startsWith(normalizedRepoRoot)) {
      errors.push(`Security error: Path "${targetPath}" resolves outside repository boundary.`);
      continue;
    }

    // 2. Sensitive directory and extension checks
    if (targetPath.startsWith('.git/') || targetPath.startsWith('.git\\')) {
      errors.push('Modifying git internal metadata directory (.git) is prohibited.');
      continue;
    }

    const baseName = path.basename(targetPath).toLowerCase();
    if (FORBIDDEN_FILENAMES.has(baseName) || baseName.startsWith('.env')) {
      errors.push(`Modifying environment or secret configuration "${baseName}" is prohibited.`);
      continue;
    }

    const ext = path.extname(targetPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(`File extension "${ext}" for "${targetPath}" is not in the allowed source filetypes list.`);
      continue;
    }

    // 3. Source file existence and context compatibility check
    if (!fs.existsSync(fullPath)) {
      // If it's not a new file addition, it must exist
      if (patch.oldPath !== '/dev/null') {
        errors.push(`Target file does not exist in repository: "${targetPath}". Cannot apply patch.`);
        continue;
      }
    } else {
      // Verify hunk context against real file content to prevent applying stale patches
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const fileLines = fileContent.split('\n');

      for (const hunk of patch.hunks) {
        // Collect old lines (lines starting with ' ' or '-')
        const expectedOldLines = hunk.lines
          .filter((l) => l.startsWith(' ') || l.startsWith('-'))
          .map((l) => l.substring(1).trim());

        if (expectedOldLines.length > 0) {
          // Check if expected content is present near hunk.oldStart
          const windowStart = Math.max(0, hunk.oldStart - 5);
          const windowEnd = Math.min(fileLines.length, hunk.oldStart + hunk.oldLines + 10);
          const searchWindow = fileLines.slice(windowStart, windowEnd).map((l) => l.trim());

          const anyLineMatches = expectedOldLines.some((exp) => searchWindow.includes(exp));
          if (!anyLineMatches) {
            errors.push(
              `Stale patch detected in "${targetPath}": expected lines around line ${hunk.oldStart} do not match repository content.`
            );
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    patches,
  };
}
