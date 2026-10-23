/**
 * Pluggable Artifact & UserJourney Repository
 *
 * Implements tenant-scoped persistence for captured Playwright screenshots,
 * run video recordings, execution logs, and end-to-end interactive journeys.
 */

import type { Artifact } from '../types/index.ts';
import type { UserJourney } from '../types/journey.ts';
import type { TenantContext } from '../types/tenant-context.ts';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { ArtifactRow, UserJourneyRow } from '../types/database-entities.ts';
import { TABLE_NAMES } from '../types/database-entities.ts';
import { createDefaultTenantContext } from '../types/tenant-context.ts';

export class PluggableArtifactJourneyRepository {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async getArtifacts(runId: string, context?: TenantContext): Promise<Artifact[]> {
    const ctx = context || createDefaultTenantContext();
    const sql = ctx.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.ARTIFACTS} WHERE run_id = ? ORDER BY created_at ASC;`
      : `SELECT * FROM ${TABLE_NAMES.ARTIFACTS} WHERE run_id = ? AND tenant_id = ? ORDER BY created_at ASC;`;

    const params = ctx.isSystemAdmin ? [runId] : [runId, ctx.tenantId];
    const res = await this.driver.query<ArtifactRow>(sql, params);
    return res.rows.map(this.mapArtifactRowToModel);
  }

  public async saveArtifact(artifact: Artifact, context?: TenantContext): Promise<Artifact> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();
    const createdAt = artifact.createdAt || now;

    const sql = `
      INSERT INTO ${TABLE_NAMES.ARTIFACTS} (
        id, run_id, tenant_id, type, file_path, size_bytes, mime_type, caption, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.driver.execute(sql, [
      artifact.id,
      artifact.runId,
      ctx.tenantId,
      artifact.artifactType || 'screenshot',
      artifact.storagePath || artifact.fileName,
      artifact.sizeBytes || 0,
      artifact.mimeType || 'application/octet-stream',
      artifact.fileName || null,
      JSON.stringify({ testResultId: artifact.testResultId }),
      createdAt,
    ]);

    return artifact;
  }

  public async getJourneys(requesterUserId?: string, context?: TenantContext): Promise<UserJourney[]> {
    const ctx = context || createDefaultTenantContext();
    let sql = `SELECT * FROM ${TABLE_NAMES.JOURNEYS}`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!ctx.isSystemAdmin) {
      conditions.push('tenant_id = ?');
      params.push(ctx.tenantId);
    }

    if (requesterUserId && requesterUserId !== 'usr_default') {
      conditions.push('owner_id = ?');
      params.push(requesterUserId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ` ORDER BY created_at DESC;`;

    const res = await this.driver.query<UserJourneyRow>(sql, params);
    return res.rows.map(this.mapJourneyRowToModel);
  }

  public async getJourneyById(
    journeyId: string,
    requesterUserId?: string,
    context?: TenantContext
  ): Promise<UserJourney | null> {
    const ctx = context || createDefaultTenantContext();
    let sql = `SELECT * FROM ${TABLE_NAMES.JOURNEYS} WHERE id = ?`;
    const params: unknown[] = [journeyId];

    if (!ctx.isSystemAdmin) {
      sql += ` AND tenant_id = ?`;
      params.push(ctx.tenantId);
    }

    const res = await this.driver.query<UserJourneyRow>(sql, params);
    if (res.rows.length === 0) return null;

    const journey = this.mapJourneyRowToModel(res.rows[0]);
    if (requesterUserId && journey.ownerId !== requesterUserId && !ctx.isSystemAdmin) {
      throw new Error(`Access denied: User "${requesterUserId}" does not own journey "${journeyId}".`);
    }

    return journey;
  }

  public async saveJourney(
    journey: UserJourney,
    requesterUserId?: string,
    context?: TenantContext
  ): Promise<UserJourney> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();
    const existing = await this.getJourneyById(journey.id, requesterUserId, ctx);

    if (existing) {
      const sql = `
        UPDATE ${TABLE_NAMES.JOURNEYS}
        SET title = ?, description = ?, target_url = ?, steps_json = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?;
      `;
      await this.driver.execute(sql, [
        journey.title,
        journey.description || null,
        journey.config?.baseUrl || 'http://localhost:3000',
        JSON.stringify(journey.steps || []),
        now,
        journey.id,
        ctx.tenantId,
      ]);
    } else {
      const sql = `
        INSERT INTO ${TABLE_NAMES.JOURNEYS} (
          id, tenant_id, owner_id, title, description, target_url, steps_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      await this.driver.execute(sql, [
        journey.id,
        ctx.tenantId,
        journey.ownerId || requesterUserId || ctx.userId,
        journey.title,
        journey.description || null,
        journey.config?.baseUrl || 'http://localhost:3000',
        JSON.stringify(journey.steps || []),
        journey.createdAt || now,
        now,
      ]);
    }

    return journey;
  }

  public async deleteJourney(
    journeyId: string,
    requesterUserId?: string,
    context?: TenantContext
  ): Promise<boolean> {
    const ctx = context || createDefaultTenantContext();
    const existing = await this.getJourneyById(journeyId, requesterUserId, ctx);
    if (!existing) return false;

    const sql = `DELETE FROM ${TABLE_NAMES.JOURNEYS} WHERE id = ? AND tenant_id = ?;`;
    const res = await this.driver.execute(sql, [journeyId, ctx.tenantId]);
    return res.changes > 0;
  }

  private mapArtifactRowToModel(row: ArtifactRow): Artifact {
    let metadata: any = {};
    try {
      metadata = JSON.parse(row.metadata_json || '{}');
    } catch {}

    return {
      id: row.id,
      runId: row.run_id,
      testResultId: metadata.testResultId || undefined,
      artifactType: (row.type as any) || 'screenshot',
      storagePath: row.file_path,
      fileName: row.caption || 'artifact.png',
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
    };
  }

  private mapJourneyRowToModel(row: UserJourneyRow): UserJourney {
    let steps: any[] = [];
    try {
      steps = JSON.parse(row.steps_json || '[]');
    } catch {}

    return {
      id: row.id,
      projectId: 'proj_default',
      ownerId: row.owner_id,
      title: row.title,
      description: row.description || undefined,
      schemaVersion: '1.0.0',
      steps,
      config: { baseUrl: row.target_url },
      tags: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
