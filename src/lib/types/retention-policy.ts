/**
 * TTL Retention Policy & Automated Purge Audit Schemas
 *
 * Defines contracts for automated test run retention policies,
 * cascade deletion of disk artifacts, baseline preservation,
 * and cryptographic retention audit reports.
 */

export interface TTLRetentionPolicy {
  enabled: boolean;
  retentionDays: number; // default: 30 days
  batchSize: number; // default: 500 records per transaction
  protectPinnedRuns: boolean; // default: true
  protectBaselineRuns: boolean; // default: true
  deleteDiskArtifacts: boolean; // default: true
  dryRun?: boolean;
}

export const DEFAULT_RETENTION_POLICY: TTLRetentionPolicy = {
  enabled: true,
  retentionDays: 30,
  batchSize: 500,
  protectPinnedRuns: true,
  protectBaselineRuns: true,
  deleteDiskArtifacts: true,
  dryRun: false,
};

export interface PurgedRecordSummary {
  runsCount: number;
  testResultsCount: number;
  findingsCount: number;
  artifactsCount: number;
  proposalsCount: number;
  diskFilesDeleted: number;
  diskBytesReclaimed: number;
}

export interface RetentionAuditReport {
  id: string;
  tenantId?: string;
  triggeredAt: string;
  completedAt: string;
  durationMs: number;
  retentionCutoffDate: string;
  policy: TTLRetentionPolicy;
  summary: PurgedRecordSummary;
  purgedRunIds: string[];
  sha256AuditSignature: string;
}
