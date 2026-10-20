import fs from 'fs';
import path from 'path';
import { parseUnifiedDiff, type ParsedFilePatch, type ParsedHunk } from './patch-validator.ts';

export interface PatchApplyResult {
  success: boolean;
  appliedFiles: string[];
  conflictErrors: string[];
}

/**
 * Attempts to apply a single hunk to an array of lines.
 * Returns the modified array of lines or null if context does not match.
 */
function applyHunkToLines(lines: string[], hunk: ParsedHunk): string[] | null {
  const targetStart = hunk.oldStart - 1; // 0-indexed

  // Check context matching
  let oldLineIdx = 0;
  for (const diffLine of hunk.lines) {
    if (diffLine.startsWith('-') || diffLine.startsWith(' ')) {
      const expectedText = diffLine.slice(1);
      const actualLine = lines[targetStart + oldLineIdx];

      // Trim whitespace for robust matching against CRLF/LF discrepancies
      if (actualLine === undefined || actualLine.trim() !== expectedText.trim()) {
        return null; // Conflict / mismatch
      }
      oldLineIdx++;
    }
  }

  // Context matched! Build new lines
  const result: string[] = [];
  result.push(...lines.slice(0, targetStart));

  for (const diffLine of hunk.lines) {
    if (diffLine.startsWith('+')) {
      result.push(diffLine.slice(1));
    } else if (diffLine.startsWith(' ')) {
      result.push(diffLine.slice(1));
    }
    // Omit '-' lines
  }

  result.push(...lines.slice(targetStart + hunk.oldLines));
  return result;
}

/**
 * Applies a full unified diff onto a target workspace atomically.
 * If any file or hunk fails context matching, zero files are modified.
 */
export function applyPatchAtomically(
  workspacePath: string,
  diffText: string
): PatchApplyResult {
  const patches = parseUnifiedDiff(diffText);
  const plannedModifications: Array<{ filePath: string; originalContent: string; newContent: string }> = [];
  const conflictErrors: string[] = [];

  for (const patch of patches) {
    const relPath = patch.newPath.replace(/^b\//, '').replace(/^a\//, '');
    const absPath = path.join(workspacePath, relPath);

    let originalContent = '';
    let lines: string[] = [];

    if (fs.existsSync(absPath)) {
      originalContent = fs.readFileSync(absPath, 'utf8');
      lines = originalContent.split(/\r?\n/);
    } else {
      // File creation hunk
      originalContent = '';
      lines = [];
    }

    let modifiedLines = [...lines];
    for (let hIdx = 0; hIdx < patch.hunks.length; hIdx++) {
      const hunk = patch.hunks[hIdx];
      const applied = applyHunkToLines(modifiedLines, hunk);

      if (!applied) {
        conflictErrors.push(
          `Conflict in file "${relPath}" at hunk #${hIdx + 1} (line ${hunk.oldStart}): Context lines did not match target file.`
        );
        break;
      }
      modifiedLines = applied;
    }

    if (conflictErrors.length === 0) {
      plannedModifications.push({
        filePath: absPath,
        originalContent,
        newContent: modifiedLines.join('\n'),
      });
    }
  }

  if (conflictErrors.length > 0) {
    return {
      success: false,
      appliedFiles: [],
      conflictErrors,
    };
  }

  // Atomically write all planned modifications
  const appliedFiles: string[] = [];
  for (const mod of plannedModifications) {
    const parentDir = path.dirname(mod.filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(mod.filePath, mod.newContent, 'utf8');
    appliedFiles.push(path.relative(workspacePath, mod.filePath).replace(/\\/g, '/'));
  }

  return {
    success: true,
    appliedFiles,
    conflictErrors: [],
  };
}
