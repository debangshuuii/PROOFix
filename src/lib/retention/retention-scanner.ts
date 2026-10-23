/**
 * TTL Retention Candidate Scanner
 *
 * Scans verification runs older than the configured TTL retention window
 * (default 30 days) with configurable batch thresholds.
 */

import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { TTLRetentionPolicy } from '../types/retention-policy.ts';
import { DEFAULT_RETENTION_POLICY } from '../types/retention-policy.ts';

export interface CandidateRunForPurge {
  id: string;
  projectId: string;
  tenantId: string;
  createdAt: string;
  isPinned: boolean;
  isBaseline: boolean;
}

export class RetentionCandidateScanner {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public calculateCutoffDate(retentionDays: number = 30): Date {
    const now = Date.now();
    const cutoffMs = now - retentionDays * 24 * 60 * 60 * 1000;
    return new Date(cutoffMs);
  }

  public async scanExpiredRuns(
    policy: TTLRetentionPolicy = DEFAULT_RETENTION_POLICY,
    tenantId?: string
  ): Promise<{ cutoffDate: string; candidates: CandidateRunForPurge[] }> {
    const cutoff = this.calculateCutoffDate(policy.retentionDays);
    const cutoffIso = cutoff.toISOString();

    let sql = `
      SELECT id, project_id, tenant_id, created_at, is_pinned, is_baseline
      FROM proofix_verification_runs
      WHERE created_at < ?
    `;
    const params: unknown[] = [cutoffIso];

    if (tenantId) {
      sql += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    sql += ` ORDER BY created_at ASC LIMIT ?;`;
    params.push(policy.batchSize);

    const res = await this.driver.query<{
      id: string;
      project_id: string;
      tenant_id: string;
      created_at: string;
      is_pinned: number;
      is_baseline: number;
    }>(sql, params);

    const candidates: CandidateRunForPurge[] = res.rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      tenantId: r.tenant_id,
      createdAt: r.created_at,
      isPinned: Boolean(r.is_pinned),
      isBaseline: Boolean(r.is_baseline),
    }));

    return {
      cutoffDate: cutoffIso,
      candidates,
    };
  }
}
