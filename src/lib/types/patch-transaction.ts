/**
 * PROOFix Transactional Patch Application and Rollback Journal Schemas
 */

export type TransactionStatus =
  | 'pending'
  | 'in_progress'
  | 'committed'
  | 'rolled_back'
  | 'failed';

export interface FileBackupEntry {
  filePath: string;
  absolutePath: string;
  originalHash: string;
  originalContent: string;
  patchedContent?: string;
  existsPriorToPatch: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export interface PatchTransactionJournal {
  transactionId: string;
  proposalId: string;
  candidateId?: string;
  repoRoot: string;
  status: TransactionStatus;
  startedAt: string;
  completedAt?: string;
  backupEntries: FileBackupEntry[];
  reverseDiff?: string;
  rollbackReason?: string;
  executionDurationMs?: number;
}

export interface RollbackResult {
  transactionId: string;
  success: boolean;
  filesRestored: string[];
  filesDeleted: string[];
  durationMs: number;
  error?: string;
}

export interface AtomicPatchApplyResult {
  transactionId: string;
  success: boolean;
  modifiedFiles: string[];
  createdFiles: string[];
  totalHunksApplied: number;
  journal: PatchTransactionJournal;
  error?: string;
}
