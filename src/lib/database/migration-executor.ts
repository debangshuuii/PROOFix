/**
 * Transactional Migration Executor & Version Tracker
 *
 * Executes individual SQL migration scripts inside atomic transactions,
 * records applied versions in _proofix_migrations with execution timestamps,
 * and tracks batch identifiers.
 */

import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { MigrationRecord, MigrationScript } from '../types/migration-manifest.ts';

export class MigrationVersionTracker {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async initMigrationTable(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS _proofix_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        batch_id INTEGER NOT NULL DEFAULT 1
      );
    `;
    await this.driver.execute(ddl);
  }

  public async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.initMigrationTable();
    const sql = `
      SELECT id, version, name, checksum_sha256, applied_at, execution_time_ms, batch_id
      FROM _proofix_migrations
      ORDER BY version ASC;
    `;
    const res = await this.driver.query<MigrationRecord>(sql);
    return res.rows;
  }

  public async getLatestBatchId(): Promise<number> {
    await this.initMigrationTable();
    const sql = `SELECT MAX(batch_id) as max_batch FROM _proofix_migrations;`;
    const res = await this.driver.query<{ max_batch: number | null }>(sql);
    return (res.rows[0]?.max_batch || 0) + 1;
  }

  public async executeMigrationInTransaction(
    script: MigrationScript,
    batchId: number
  ): Promise<MigrationRecord> {
    const start = Date.now();
    const tx = await this.driver.beginTransaction('SERIALIZABLE');

    try {
      // Execute each statement in UP script
      const statements = script.upSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        await tx.execute(stmt);
      }

      const durationMs = Date.now() - start;
      const record: MigrationRecord = {
        version: script.version,
        name: script.name,
        checksum_sha256: script.checksumSha256,
        applied_at: new Date().toISOString(),
        execution_time_ms: durationMs,
        batch_id: batchId,
      };

      const recordSql = `
        INSERT INTO _proofix_migrations (version, name, checksum_sha256, applied_at, execution_time_ms, batch_id)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
      await tx.execute(recordSql, [
        record.version,
        record.name,
        record.checksum_sha256,
        record.applied_at,
        record.execution_time_ms,
        record.batch_id,
      ]);

      await tx.commit();
      return record;
    } catch (err) {
      await tx.rollback();
      throw new Error(`Failed to execute migration ${script.version} (${script.name}): ${(err as Error).message}`);
    }
  }

  public async removeMigrationRecord(version: number): Promise<void> {
    const sql = `DELETE FROM _proofix_migrations WHERE version = ?;`;
    await this.driver.execute(sql, [version]);
  }
}
