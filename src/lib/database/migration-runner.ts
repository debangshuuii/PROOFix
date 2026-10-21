/**
 * Automated SQL Migration Runner & Schema Version Tracker (Contribution 213)
 *
 * Discovers, validates checksums, and atomically executes SQL migrations
 * against physical database adapters, maintaining the _schema_migrations ledger.
 */

import crypto from 'crypto';
import type {
  IDatabaseAdapter,
  MigrationScript,
  MigrationRecord,
  MigrationExecutionResult,
} from '../types/database-adapters.ts';

export class MigrationRunner {
  private registeredScripts: MigrationScript[] = [];

  constructor(initialScripts?: MigrationScript[]) {
    if (initialScripts) {
      this.registeredScripts = [...initialScripts].sort((a, b) => a.version - b.version);
    }
  }

  /**
   * Registers a migration script.
   */
  public registerScript(
    version: number,
    id: string,
    description: string,
    upSql: string,
    downSql?: string
  ): void {
    const checksum = crypto.createHash('sha256').update(upSql.trim()).digest('hex');
    this.registeredScripts.push({
      version,
      id,
      description,
      upSql,
      downSql,
      checksum,
    });
    this.registeredScripts.sort((a, b) => a.version - b.version);
  }

  /**
   * Computes SHA-256 checksum of SQL string.
   */
  public computeChecksum(sql: string): string {
    return crypto.createHash('sha256').update(sql.trim()).digest('hex');
  }

  /**
   * Runs all pending migrations against the provided database adapter.
   */
  public async migrateUp(adapter: IDatabaseAdapter): Promise<MigrationExecutionResult> {
    // 1. Ensure _schema_migrations exists
    await adapter.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version INTEGER PRIMARY KEY,
        id VARCHAR(128) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 2. Fetch applied migrations
    const appliedResult = await adapter.query<MigrationRecord>(
      'SELECT version, id, checksum, applied_at as "appliedAt", execution_time_ms as "executionTimeMs" FROM _schema_migrations ORDER BY version ASC;'
    );
    const appliedMap = new Map<number, MigrationRecord>();
    for (const row of appliedResult.rows) {
      appliedMap.set(row.version, row);
    }

    const newlyApplied: MigrationRecord[] = [];

    // 3. Validate existing checksums & apply pending
    for (const script of this.registeredScripts) {
      const existing = appliedMap.get(script.version);

      if (existing) {
        if (existing.checksum !== script.checksum) {
          throw new Error(
            `Migration checksum mismatch for version ${script.version} (${script.id}). Expected ${script.checksum}, found ${existing.checksum}. Schema drift detected!`
          );
        }
        continue;
      }

      // Execute migration
      const start = Date.now();
      const tx = await adapter.beginTransaction();
      try {
        await tx.query(script.upSql);
        const duration = Date.now() - start;

        await tx.query(
          'INSERT INTO _schema_migrations (version, id, checksum, execution_time_ms) VALUES ($1, $2, $3, $4);',
          [script.version, script.id, script.checksum, duration]
        );

        await tx.commit();

        const record: MigrationRecord = {
          version: script.version,
          id: script.id,
          checksum: script.checksum,
          appliedAt: new Date().toISOString(),
          executionTimeMs: duration,
        };
        newlyApplied.push(record);
        appliedMap.set(script.version, record);
      } catch (err) {
        await tx.rollback();
        throw new Error(
          `Failed executing migration ${script.version} (${script.id}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const allApplied = Array.from(appliedMap.values()).sort((a, b) => a.version - b.version);
    const currentVersion = allApplied.length > 0 ? allApplied[allApplied.length - 1].version : 0;
    const pendingCount = this.registeredScripts.filter((s) => !appliedMap.has(s.version)).length;

    return {
      appliedCount: newlyApplied.length,
      pendingCount,
      currentVersion,
      migrations: allApplied,
    };
  }

  public getRegisteredScripts(): MigrationScript[] {
    return [...this.registeredScripts];
  }
}

export const globalMigrationRunner = new MigrationRunner();

// Register default migrations
globalMigrationRunner.registerScript(
  1,
  '001_initial_schema',
  'Create _schema_migrations tracking table',
  'CREATE TABLE IF NOT EXISTS _schema_migrations (version INTEGER PRIMARY KEY, id VARCHAR(128) NOT NULL, checksum VARCHAR(64) NOT NULL, applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, execution_time_ms INTEGER NOT NULL DEFAULT 0);'
);

globalMigrationRunner.registerScript(
  2,
  '002_audit_ledger',
  'Create SOC2 audit ledger',
  'CREATE TABLE IF NOT EXISTS audit_ledger (sequence_id BIGSERIAL PRIMARY KEY, event_id VARCHAR(64) NOT NULL UNIQUE, tenant_id VARCHAR(64) NOT NULL DEFAULT \'default\', event_type VARCHAR(64) NOT NULL, actor_id VARCHAR(128) NOT NULL, actor_role VARCHAR(64) NOT NULL, resource_type VARCHAR(64) NOT NULL, resource_id VARCHAR(128) NOT NULL, action VARCHAR(64) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT \'SUCCESS\', prev_hash VARCHAR(64) NOT NULL, curr_hash VARCHAR(64) NOT NULL, payload JSONB DEFAULT \'{}\'::jsonb, ip_address VARCHAR(45), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);'
);

globalMigrationRunner.registerScript(
  3,
  '003_queue_jobs',
  'Create queue jobs and outbox events tables',
  'CREATE TABLE IF NOT EXISTS queue_jobs (id VARCHAR(64) PRIMARY KEY, partition_id INTEGER NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT \'queued\', priority INTEGER NOT NULL DEFAULT 5, payload JSONB NOT NULL DEFAULT \'{}\'::jsonb, retry_count INTEGER NOT NULL DEFAULT 0, max_retries INTEGER NOT NULL DEFAULT 3, worker_id VARCHAR(128), lease_expires_at TIMESTAMP WITH TIME ZONE, error_message TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS outbox_events (id VARCHAR(64) PRIMARY KEY, topic VARCHAR(128) NOT NULL, idempotency_key VARCHAR(128) NOT NULL UNIQUE, payload JSONB NOT NULL DEFAULT \'{}\'::jsonb, status VARCHAR(32) NOT NULL DEFAULT \'pending\', published_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);'
);
