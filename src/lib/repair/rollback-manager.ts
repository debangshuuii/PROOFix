import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  PatchTransactionJournal,
  RollbackResult,
} from '../types/patch-transaction.ts';

const TRANSACTIONS_DATA_DIR = path.join(process.cwd(), 'data', 'patch_transactions');

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Persists transaction journal for auditability
 */
export function persistTransactionJournal(journal: PatchTransactionJournal): void {
  try {
    if (!fs.existsSync(TRANSACTIONS_DATA_DIR)) {
      fs.mkdirSync(TRANSACTIONS_DATA_DIR, { recursive: true });
    }
    const filePath = path.join(TRANSACTIONS_DATA_DIR, `${journal.transactionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(journal, null, 2), 'utf8');
  } catch {
    // Non-fatal logging error
  }
}

/**
 * Loads a persisted transaction journal by ID
 */
export function loadTransactionJournal(transactionId: string): PatchTransactionJournal | null {
  const filePath = path.join(TRANSACTIONS_DATA_DIR, `${transactionId}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as PatchTransactionJournal;
  } catch {
    return null;
  }
}

/**
 * Reverts all modified files and removes newly created files recorded in transaction
 */
export async function rollbackTransaction(
  journal: PatchTransactionJournal,
  reason: string = 'User requested or automated verification failed'
): Promise<RollbackResult> {
  const startTime = Date.now();
  const filesRestored: string[] = [];
  const filesDeleted: string[] = [];

  try {
    for (const backup of journal.backupEntries) {
      if (backup.existsPriorToPatch) {
        // Restore original content
        const parentDir = path.dirname(backup.absolutePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(backup.absolutePath, backup.originalContent, 'utf8');

        // Verify SHA256 matches original hash
        const restoredHash = computeSha256(backup.originalContent);
        if (restoredHash === backup.originalHash) {
          filesRestored.push(backup.filePath);
        } else {
          throw new Error(`Hash mismatch after restoring file: ${backup.filePath}`);
        }
      } else {
        // File was newly created by patch -> remove it
        if (fs.existsSync(backup.absolutePath)) {
          fs.unlinkSync(backup.absolutePath);
          filesDeleted.push(backup.filePath);
        }
      }
    }

    journal.status = 'rolled_back';
    journal.rollbackReason = reason;
    journal.completedAt = new Date().toISOString();
    persistTransactionJournal(journal);

    return {
      transactionId: journal.transactionId,
      success: true,
      filesRestored,
      filesDeleted,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    journal.status = 'failed';
    journal.rollbackReason = `Rollback error: ${err.message}`;
    persistTransactionJournal(journal);

    return {
      transactionId: journal.transactionId,
      success: false,
      filesRestored,
      filesDeleted,
      durationMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

/**
 * Inspects repository files against original backups to detect uncommitted dirty state
 */
export function detectDirtyFiles(
  journal: PatchTransactionJournal
): Array<{ filePath: string; isDirty: boolean; currentHash?: string }> {
  return journal.backupEntries.map((backup) => {
    if (!fs.existsSync(backup.absolutePath)) {
      return {
        filePath: backup.filePath,
        isDirty: backup.existsPriorToPatch, // dirty if it used to exist
      };
    }

    const currentContent = fs.readFileSync(backup.absolutePath, 'utf8');
    const currentHash = computeSha256(currentContent);
    const isDirty = currentHash !== backup.originalHash;

    return {
      filePath: backup.filePath,
      isDirty,
      currentHash,
    };
  });
}
