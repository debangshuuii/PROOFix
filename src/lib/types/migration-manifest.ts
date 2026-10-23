/**
 * Automated Database Migration Manifest & Checksum Verification Schemas
 *
 * Defines contracts for migration discovery, SHA-256 checksum tracking,
 * batch transactional execution, and rollback recovery.
 */

export interface MigrationScript {
  version: number;
  name: string;
  fileName: string;
  checksumSha256: string;
  upSql: string;
  downSql?: string;
  description?: string;
}

export interface MigrationRecord {
  id?: number;
  version: number;
  name: string;
  checksum_sha256: string;
  applied_at: string;
  execution_time_ms: number;
  batch_id: number;
}

export interface ChecksumMismatchErrorDetail {
  version: number;
  name: string;
  expectedChecksum: string;
  storedChecksum: string;
}

export interface MigrationExecutionReport {
  success: boolean;
  dialect: string;
  appliedCount: number;
  rolledBackCount: number;
  totalExecutionMs: number;
  currentVersion: number;
  appliedVersions: number[];
  pendingVersions: number[];
  checksumMismatches: ChecksumMismatchErrorDetail[];
  error?: string;
}

export interface MigrationPlan {
  currentVersion: number;
  targetVersion: number;
  direction: 'up' | 'down';
  scriptsToExecute: MigrationScript[];
}
