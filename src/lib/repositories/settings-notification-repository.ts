/**
 * Pluggable SystemSettings & ProjectNotificationSettings Repository
 *
 * Implements tenant-scoped configuration persistence for AI model providers,
 * notification webhooks (Slack/Discord), and project-level alerting thresholds.
 */

import type { SystemSettings, ProjectNotificationSettings } from '../types/index.ts';
import type { TenantContext } from '../types/tenant-context.ts';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { SystemSettingsRow, ProjectNotificationSettingsRow } from '../types/database-entities.ts';
import { TABLE_NAMES } from '../types/database-entities.ts';
import { createDefaultTenantContext } from '../types/tenant-context.ts';
import { getDefaultNotificationSettings } from '../notifications/schema.ts';

export class PluggableSettingsRepository {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async getSettings(context?: TenantContext): Promise<SystemSettings> {
    const ctx = context || createDefaultTenantContext();
    const sql = `SELECT * FROM ${TABLE_NAMES.SETTINGS} WHERE tenant_id = ?;`;
    const res = await this.driver.query<SystemSettingsRow>(sql, [ctx.tenantId]);

    if (res.rows.length === 0) {
      return this.getDefaultSettings();
    }

    try {
      return {
        ...this.getDefaultSettings(),
        ...JSON.parse(res.rows[0].settings_json),
      };
    } catch {
      return this.getDefaultSettings();
    }
  }

  public async updateSettings(
    updates: Partial<SystemSettings>,
    context?: TenantContext
  ): Promise<SystemSettings> {
    const ctx = context || createDefaultTenantContext();
    const current = await this.getSettings(ctx);
    const merged: SystemSettings = {
      ...current,
      ...updates,
      geminiApiKeyConfigured: updates.geminiApiKey ? true : current.geminiApiKeyConfigured,
      openaiApiKeyConfigured: updates.openaiApiKey ? true : current.openaiApiKeyConfigured,
      anthropicApiKeyConfigured: updates.anthropicApiKey ? true : current.anthropicApiKeyConfigured,
    };

    const now = new Date().toISOString();
    const sql = `
      INSERT INTO ${TABLE_NAMES.SETTINGS} (id, tenant_id, settings_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at;
    `;

    await this.driver.execute(sql, [
      `sett_${ctx.tenantId}`,
      ctx.tenantId,
      JSON.stringify(merged),
      now,
    ]);

    return merged;
  }

  public async getProjectNotificationSettings(
    projectId: string,
    context?: TenantContext
  ): Promise<ProjectNotificationSettings> {
    const ctx = context || createDefaultTenantContext();
    const sql = `SELECT * FROM ${TABLE_NAMES.NOTIFICATIONS} WHERE project_id = ? AND tenant_id = ?;`;
    const res = await this.driver.query<ProjectNotificationSettingsRow>(sql, [projectId, ctx.tenantId]);

    if (res.rows.length === 0) {
      return getDefaultNotificationSettings(projectId);
    }

    try {
      return {
        ...getDefaultNotificationSettings(projectId),
        ...JSON.parse(res.rows[0].settings_json),
      };
    } catch {
      return getDefaultNotificationSettings(projectId);
    }
  }

  public async saveProjectNotificationSettings(
    projectId: string,
    settings: ProjectNotificationSettings,
    context?: TenantContext
  ): Promise<ProjectNotificationSettings> {
    const ctx = context || createDefaultTenantContext();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO ${TABLE_NAMES.NOTIFICATIONS} (project_id, tenant_id, settings_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at;
    `;

    await this.driver.execute(sql, [
      projectId,
      ctx.tenantId,
      JSON.stringify(settings),
      now,
    ]);

    return settings;
  }

  private getDefaultSettings(): SystemSettings {
    return {
      activeAiProvider: 'offline_heuristic',
      geminiApiKeyConfigured: false,
      openaiApiKeyConfigured: false,
      anthropicApiKeyConfigured: false,
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      defaultExecutionTimeoutSecs: 30,
      maxConcurrentRuns: 2,
    };
  }
}
