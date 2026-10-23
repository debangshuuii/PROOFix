/**
 * Pluggable VerificationRun, TestResult & Finding Repository
 *
 * Implements tenant-partitioned persistence for execution runs,
 * Playwright browser test results, and evidence-grounded AI findings.
 */

import type { VerificationRun, TestResult, Finding } from '../types/index.ts';
import type { TenantContext } from '../types/tenant-context.ts';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { VerificationRunRow, TestResultRow, FindingRow } from '../types/database-entities.ts';
import { TABLE_NAMES } from '../types/database-entities.ts';
import { createDefaultTenantContext } from '../types/tenant-context.ts';

export class PluggableRunRepository {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async getRuns(projectId?: string, context?: TenantContext): Promise<VerificationRun[]> {
    const ctx = context || createDefaultTenantContext();
    let sql = `SELECT * FROM ${TABLE_NAMES.RUNS}`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!ctx.isSystemAdmin) {
      conditions.push('tenant_id = ?');
      params.push(ctx.tenantId);
    }

    if (projectId) {
      conditions.push('project_id = ?');
      params.push(projectId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ` ORDER BY created_at DESC;`;

    const res = await this.driver.query<VerificationRunRow>(sql, params);
    return res.rows.map(this.mapRunRowToModel);
  }

  public async getRunById(id: string, context?: TenantContext): Promise<VerificationRun | null> {
    const ctx = context || createDefaultTenantContext();
    const sql = ctx.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.RUNS} WHERE id = ?;`
      : `SELECT * FROM ${TABLE_NAMES.RUNS} WHERE id = ? AND tenant_id = ?;`;

    const params = ctx.isSystemAdmin ? [id] : [id, ctx.tenantId];
    const res = await this.driver.query<VerificationRunRow>(sql, params);
    if (res.rows.length === 0) return null;
    return this.mapRunRowToModel(res.rows[0]);
  }

  public async createRun(run: VerificationRun, context?: TenantContext): Promise<VerificationRun> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();
    const createdAt = run.startedAt || now;

    const sql = `
      INSERT INTO ${TABLE_NAMES.RUNS} (
        id, project_id, project_version_id, tenant_id, run_number,
        status, build_status, startup_status, started_at, completed_at,
        duration_ms, commit_hash, branch, execution_config_json,
        isolation_disclaimer, summary_json, error_summary, logs_json,
        is_pinned, is_baseline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.driver.execute(sql, [
      run.id,
      run.projectId,
      run.projectVersionId,
      ctx.tenantId,
      run.runNumber,
      run.status,
      run.buildStatus,
      run.startupStatus,
      run.startedAt,
      run.completedAt || null,
      run.durationMs || 0,
      run.commitHash,
      run.branch,
      JSON.stringify(run.executionConfig || {}),
      run.isolationDisclaimer || null,
      JSON.stringify(run.summary || {}),
      run.errorSummary || null,
      JSON.stringify(run.logs || []),
      0,
      0,
      createdAt,
    ]);

    return run;
  }

  public async updateRun(
    id: string,
    updates: Partial<VerificationRun>,
    context?: TenantContext
  ): Promise<VerificationRun> {
    const ctx = context || createDefaultTenantContext();
    const existing = await this.getRunById(id, ctx);
    if (!existing) {
      throw new Error(`VerificationRun with ID "${id}" not found.`);
    }

    const merged: VerificationRun = {
      ...existing,
      ...updates,
    };

    const sql = `
      UPDATE ${TABLE_NAMES.RUNS}
      SET status = ?, build_status = ?, startup_status = ?, completed_at = ?,
          duration_ms = ?, summary_json = ?, error_summary = ?, logs_json = ?
      WHERE id = ? AND tenant_id = ?;
    `;

    await this.driver.execute(sql, [
      merged.status,
      merged.buildStatus,
      merged.startupStatus,
      merged.completedAt || null,
      merged.durationMs || 0,
      JSON.stringify(merged.summary || {}),
      merged.errorSummary || null,
      JSON.stringify(merged.logs || []),
      id,
      ctx.tenantId,
    ]);

    return merged;
  }

  public async getTestResults(runId: string, context?: TenantContext): Promise<TestResult[]> {
    const ctx = context || createDefaultTenantContext();
    const sql = ctx.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.TEST_RESULTS} WHERE run_id = ? ORDER BY created_at ASC;`
      : `SELECT * FROM ${TABLE_NAMES.TEST_RESULTS} WHERE run_id = ? AND tenant_id = ? ORDER BY created_at ASC;`;

    const params = ctx.isSystemAdmin ? [runId] : [runId, ctx.tenantId];
    const res = await this.driver.query<TestResultRow>(sql, params);
    return res.rows.map(this.mapTestResultRowToModel);
  }

  public async saveTestResults(results: TestResult[], context?: TenantContext): Promise<void> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();

    for (const tr of results) {
      const sql = `
        INSERT INTO ${TABLE_NAMES.TEST_RESULTS} (
          id, run_id, tenant_id, name, type, status, duration_ms,
          error_message, stack_trace, route_path, http_status, evidence_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      await this.driver.execute(sql, [
        tr.id,
        tr.runId,
        ctx.tenantId,
        tr.name,
        tr.type,
        tr.status,
        tr.durationMs || 0,
        tr.errorMessage || null,
        tr.stackTrace || null,
        tr.routePath || null,
        tr.httpStatus || null,
        JSON.stringify(tr.evidence || {}),
        now,
      ]);
    }
  }

  public async getFindings(runId: string, context?: TenantContext): Promise<Finding[]> {
    const ctx = context || createDefaultTenantContext();
    const sql = ctx.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.FINDINGS} WHERE run_id = ? ORDER BY created_at ASC;`
      : `SELECT * FROM ${TABLE_NAMES.FINDINGS} WHERE run_id = ? AND tenant_id = ? ORDER BY created_at ASC;`;

    const params = ctx.isSystemAdmin ? [runId] : [runId, ctx.tenantId];
    const res = await this.driver.query<FindingRow>(sql, params);
    return res.rows.map(this.mapFindingRowToModel);
  }

  public async saveFindings(findings: Finding[], context?: TenantContext): Promise<void> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();

    for (const f of findings) {
      const sql = `
        INSERT INTO ${TABLE_NAMES.FINDINGS} (
          id, run_id, tenant_id, category, severity, title, observed_fact,
          inferred_hypothesis, confidence, suggested_action, affected_file,
          affected_lines_json, patch_preview_diff, rule_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      await this.driver.execute(sql, [
        f.id,
        f.runId,
        ctx.tenantId,
        f.category,
        f.severity,
        f.title,
        f.observedFact,
        f.inferredHypothesis,
        f.confidence || 'high',
        f.suggestedAction,
        f.affectedFile || null,
        JSON.stringify(f.affectedLines || []),
        f.patchPreviewDiff || null,
        f.ruleId || null,
        now,
      ]);
    }
  }

  private mapRunRowToModel(row: VerificationRunRow): VerificationRun {
    let executionConfig: any = {};
    let summary: any = {};
    let logs: string[] = [];

    try {
      executionConfig = JSON.parse(row.execution_config_json);
    } catch {}
    try {
      summary = JSON.parse(row.summary_json);
    } catch {}
    try {
      logs = JSON.parse(row.logs_json);
    } catch {}

    return {
      id: row.id,
      projectId: row.project_id,
      projectVersionId: row.project_version_id,
      runNumber: row.run_number,
      status: row.status as any,
      buildStatus: row.build_status as any,
      startupStatus: row.startup_status as any,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      durationMs: row.duration_ms || undefined,
      commitHash: row.commit_hash,
      branch: row.branch,
      executionConfig,
      isolationDisclaimer: row.isolation_disclaimer || undefined,
      summary,
      errorSummary: row.error_summary || undefined,
      logs,
    };
  }

  private mapTestResultRowToModel(row: TestResultRow): TestResult {
    let evidence: any = {};
    try {
      evidence = JSON.parse(row.evidence_json);
    } catch {}

    return {
      id: row.id,
      runId: row.run_id,
      name: row.name,
      type: row.type as any,
      status: row.status as any,
      durationMs: row.duration_ms,
      errorMessage: row.error_message || undefined,
      stackTrace: row.stack_trace || undefined,
      routePath: row.route_path || undefined,
      httpStatus: row.http_status || undefined,
      evidence,
    };
  }

  private mapFindingRowToModel(row: FindingRow): Finding {
    let affectedLines: number[] = [];
    try {
      affectedLines = JSON.parse(row.affected_lines_json || '[]');
    } catch {}

    return {
      id: row.id,
      runId: row.run_id,
      category: row.category as any,
      severity: row.severity as any,
      title: row.title,
      observedFact: row.observed_fact,
      inferredHypothesis: row.inferred_hypothesis,
      confidence: row.confidence as any,
      suggestedAction: row.suggested_action,
      affectedFile: row.affected_file || undefined,
      affectedLines,
      patchPreviewDiff: row.patch_preview_diff || undefined,
      ruleId: row.rule_id || undefined,
    };
  }
}
