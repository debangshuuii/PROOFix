/**
 * Pluggable Project & ProjectVersion Repository
 *
 * Implements tenant-isolated CRUD operations for projects and analyzed versions
 * across relational physical database drivers (SQLite & PostgreSQL).
 */

import type { Project, ProjectVersion } from '../types/index.ts';
import type { TenantContext } from '../types/tenant-context.ts';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { ProjectRow, ProjectVersionRow } from '../types/database-entities.ts';
import { TABLE_NAMES } from '../types/database-entities.ts';
import { TenantGuard } from '../tenancy/tenant-guard.ts';

export class PluggableProjectRepository {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async getProjects(context: TenantContext): Promise<Project[]> {
    const sql = context.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.PROJECTS} ORDER BY created_at DESC;`
      : `SELECT * FROM ${TABLE_NAMES.PROJECTS} WHERE tenant_id = ? ORDER BY created_at DESC;`;

    const params = context.isSystemAdmin ? [] : [context.tenantId];
    const res = await this.driver.query<ProjectRow>(sql, params);
    return res.rows.map(this.mapProjectRowToModel);
  }

  public async getProjectById(id: string, context: TenantContext): Promise<Project | null> {
    const sql = context.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.PROJECTS} WHERE id = ?;`
      : `SELECT * FROM ${TABLE_NAMES.PROJECTS} WHERE id = ? AND tenant_id = ?;`;

    const params = context.isSystemAdmin ? [id] : [id, context.tenantId];
    const res = await this.driver.query<ProjectRow>(sql, params);
    if (res.rows.length === 0) return null;
    return this.mapProjectRowToModel(res.rows[0]);
  }

  public async createProject(project: Project, context: TenantContext): Promise<Project> {
    const bound = TenantGuard.bindEntity(project as any, context);
    const now = new Date().toISOString();
    const createdAt = project.createdAt || now;
    const updatedAt = project.updatedAt || now;

    const sql = `
      INSERT INTO ${TABLE_NAMES.PROJECTS} (
        id, tenant_id, organization_id, owner_id, name, description,
        repo_url, repo_provider, default_branch, local_path, config_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.driver.execute(sql, [
      bound.id,
      context.tenantId,
      context.organizationId,
      project.ownerId || context.userId,
      project.name,
      project.description || '',
      project.repoUrl,
      project.repoProvider || 'github',
      project.defaultBranch || 'main',
      project.localPath || '',
      JSON.stringify(project.config || {}),
      createdAt,
      updatedAt,
    ]);

    return {
      ...project,
      createdAt,
      updatedAt,
    };
  }

  public async updateProject(
    id: string,
    updates: Partial<Project>,
    context: TenantContext
  ): Promise<Project> {
    const existing = await this.getProjectById(id, context);
    if (!existing) {
      throw new Error(`Project with ID "${id}" not found.`);
    }

    const merged: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const sql = `
      UPDATE ${TABLE_NAMES.PROJECTS}
      SET name = ?, description = ?, repo_url = ?, default_branch = ?, local_path = ?, config_json = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?;
    `;

    await this.driver.execute(sql, [
      merged.name,
      merged.description || '',
      merged.repoUrl,
      merged.defaultBranch,
      merged.localPath,
      JSON.stringify(merged.config || {}),
      merged.updatedAt,
      id,
      context.tenantId,
    ]);

    return merged;
  }

  public async deleteProject(id: string, context: TenantContext): Promise<boolean> {
    const existing = await this.getProjectById(id, context);
    if (!existing) return false;

    const sql = `DELETE FROM ${TABLE_NAMES.PROJECTS} WHERE id = ? AND tenant_id = ?;`;
    const res = await this.driver.execute(sql, [id, context.tenantId]);
    return res.changes > 0;
  }

  public async getProjectVersions(projectId: string, context: TenantContext): Promise<ProjectVersion[]> {
    const sql = context.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.PROJECT_VERSIONS} WHERE project_id = ? ORDER BY created_at DESC;`
      : `SELECT * FROM ${TABLE_NAMES.PROJECT_VERSIONS} WHERE project_id = ? AND tenant_id = ? ORDER BY created_at DESC;`;

    const params = context.isSystemAdmin ? [projectId] : [projectId, context.tenantId];
    const res = await this.driver.query<ProjectVersionRow>(sql, params);
    return res.rows.map(this.mapProjectVersionRowToModel);
  }

  public async getProjectVersionById(id: string, context: TenantContext): Promise<ProjectVersion | null> {
    const sql = context.isSystemAdmin
      ? `SELECT * FROM ${TABLE_NAMES.PROJECT_VERSIONS} WHERE id = ?;`
      : `SELECT * FROM ${TABLE_NAMES.PROJECT_VERSIONS} WHERE id = ? AND tenant_id = ?;`;

    const params = context.isSystemAdmin ? [id] : [id, context.tenantId];
    const res = await this.driver.query<ProjectVersionRow>(sql, params);
    if (res.rows.length === 0) return null;
    return this.mapProjectVersionRowToModel(res.rows[0]);
  }

  public async createProjectVersion(version: ProjectVersion, context: TenantContext): Promise<ProjectVersion> {
    const now = new Date().toISOString();
    const createdAt = version.createdAt || now;

    const sql = `
      INSERT INTO ${TABLE_NAMES.PROJECT_VERSIONS} (
        id, project_id, tenant_id, commit_hash, branch, analysis_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    await this.driver.execute(sql, [
      version.id,
      version.projectId,
      context.tenantId,
      version.commitHash,
      version.branch || 'main',
      JSON.stringify(version.analysis || {}),
      createdAt,
    ]);

    return {
      ...version,
      createdAt,
    };
  }

  private mapProjectRowToModel(row: ProjectRow): Project {
    let config = {};
    try {
      config = JSON.parse(row.config_json);
    } catch {
      // fallback
    }

    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      repoUrl: row.repo_url,
      repoProvider: row.repo_provider as any,
      defaultBranch: row.default_branch,
      localPath: row.local_path,
      config: config as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProjectVersionRowToModel(row: ProjectVersionRow): ProjectVersion {
    let analysis = {} as any;
    try {
      analysis = JSON.parse(row.analysis_json);
    } catch {
      // fallback
    }

    return {
      id: row.id,
      projectId: row.project_id,
      commitHash: row.commit_hash,
      branch: row.branch,
      analysis,
      createdAt: row.created_at,
    };
  }
}
