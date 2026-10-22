import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AtomicPatchApplyResult,
  FileBackupEntry,
  PatchTransactionJournal,
} from '../types/patch-transaction.ts';
import { parseUnifiedDiff, type ParsedHunk } from './patch-validator.ts';
import { verifyPathSecurity } from './ephemeral-workspace-manager.ts';

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generates an inverted reverse-diff from a unified diff text
 */
export function generateReverseDiff(diffText: string): string {
  const patches = parseUnifiedDiff(diffText);
  const reverseHunks: string[] = [];

  for (const patch of patches) {
    const oldPath = patch.newPath || patch.oldPath;
    const newPath = patch.oldPath || patch.newPath;

    reverseHunks.push(`--- a/${oldPath}`);
    reverseHunks.push(`+++ b/${newPath}`);

    for (const hunk of patch.hunks) {
      // Invert line counts: old -> new, new -> old
      reverseHunks.push(
        `@@ -${hunk.newStart},${hunk.newLines} +${hunk.oldStart},${hunk.oldLines} @@`
      );

      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          reverseHunks.push(`-${line.substring(1)}`);
        } else if (line.startsWith('-')) {
          reverseHunks.push(`+${line.substring(1)}`);
        } else {
          reverseHunks.push(line);
        }
      }
    }
  }

  return reverseHunks.join('\n');
}

/**
 * Applies a hunk to lines with robust whitespace normalization
 */
function applyHunk(lines: string[], hunk: ParsedHunk): string[] | null {
  const targetStart = Math.max(0, hunk.oldStart - 1);
  let oldLineIdx = 0;

  for (const diffLine of hunk.lines) {
    if (diffLine.startsWith('-') || diffLine.startsWith(' ')) {
      const expectedText = diffLine.slice(1).trim();
      const actualLine = lines[targetStart + oldLineIdx];

      if (actualLine === undefined || actualLine.trim() !== expectedText) {
        return null;
      }
      oldLineIdx++;
    }
  }

  const result: string[] = [];
  result.push(...lines.slice(0, targetStart));

  for (const diffLine of hunk.lines) {
    if (diffLine.startsWith('+') || diffLine.startsWith(' ')) {
      result.push(diffLine.slice(1));
    }
  }

  result.push(...lines.slice(targetStart + hunk.oldLines));
  return result;
}

/**
 * Applies unified diff atomically and records comprehensive transaction backup journal
 */
export async function applyPatchWithJournal(params: {
  workspacePath: string;
  diffText: string;
  proposalId: string;
  candidateId?: string;
}): Promise<AtomicPatchApplyResult> {
  const startTime = Date.now();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const patches = parseUnifiedDiff(params.diffText);

  const journal: PatchTransactionJournal = {
    transactionId: txId,
    proposalId: params.proposalId,
    candidateId: params.candidateId,
    repoRoot: params.workspacePath,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    backupEntries: [],
    reverseDiff: generateReverseDiff(params.diffText),
  };

  if (patches.length === 0) {
    journal.status = 'failed';
    journal.rollbackReason = 'No valid file diffs found in patch.';
    return {
      transactionId: txId,
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      totalHunksApplied: 0,
      journal,
      error: 'No valid file diffs found in patch.',
    };
  }

  const plannedWrites: Array<{ absPath: string; newContent: string; isNew: boolean }> = [];
  const modifiedFiles: string[] = [];
  const createdFiles: string[] = [];
  let totalHunksApplied = 0;

  try {
    for (const patch of patches) {
      const relPath = (patch.newPath || patch.oldPath).replace(/^[ab]\//, '');
      const absPath = path.resolve(params.workspacePath, relPath);

      // Verify path security
      const sec = verifyPathSecurity(params.workspacePath, absPath);
      if (!sec.safe) {
        throw new Error(sec.violation?.message || `Forbidden target: ${relPath}`);
      }

      const exists = fs.existsSync(absPath);
      let originalContent = '';
      let lines: string[] = [];

      if (exists) {
        originalContent = fs.readFileSync(absPath, 'utf8');
        lines = originalContent.split(/\r?\n/);
      }

      const backup: FileBackupEntry = {
        filePath: relPath,
        absolutePath: absPath,
        originalHash: computeSha256(originalContent),
        originalContent,
        existsPriorToPatch: exists,
        sizeBytes: Buffer.byteLength(originalContent, 'utf8'),
        modifiedAt: exists ? fs.statSync(absPath).mtime.toISOString() : new Date().toISOString(),
      };
      journal.backupEntries.push(backup);

      let workingLines = [...lines];
      for (const hunk of patch.hunks) {
        const applied = applyHunk(workingLines, hunk);
        if (!applied) {
          throw new Error(
            `Context mismatch in "${relPath}" at line ${hunk.oldStart}. Repository content differs from patch.`
          );
        }
        workingLines = applied;
        totalHunksApplied++;
      }

      const newContent = workingLines.join('\n');
      backup.patchedContent = newContent;

      plannedWrites.push({
        absPath,
        newContent,
        isNew: !exists,
      });

      if (exists) {
        modifiedFiles.push(relPath);
      } else {
        createdFiles.push(relPath);
      }
    }

    // Atomic execution phase
    for (const item of plannedWrites) {
      const parentDir = path.dirname(item.absPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(item.absPath, item.newContent, 'utf8');
    }

    journal.status = 'committed';
    journal.completedAt = new Date().toISOString();
    journal.executionDurationMs = Date.now() - startTime;

    return {
      transactionId: txId,
      success: true,
      modifiedFiles,
      createdFiles,
      totalHunksApplied,
      journal,
    };
  } catch (err: any) {
    // Atomic rollback from backup entries
    for (const backup of journal.backupEntries) {
      try {
        if (backup.existsPriorToPatch) {
          fs.writeFileSync(backup.absolutePath, backup.originalContent, 'utf8');
        } else if (fs.existsSync(backup.absolutePath)) {
          fs.unlinkSync(backup.absolutePath);
        }
      } catch {
        // Continue restoring remaining files
      }
    }

    journal.status = 'rolled_back';
    journal.completedAt = new Date().toISOString();
    journal.rollbackReason = err.message || 'Patch application failed';
    journal.executionDurationMs = Date.now() - startTime;

    return {
      transactionId: txId,
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      totalHunksApplied: 0,
      journal,
      error: err.message,
    };
  }
}
