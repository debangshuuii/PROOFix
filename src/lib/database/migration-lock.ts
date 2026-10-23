/**
 * Distributed Migration Lock Manager
 *
 * Prevents concurrent migration executions across multi-worker clusters
 * with lease timeouts and graceful recovery.
 */

import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';

export class MigrationLockManager {
  private driver: IPhysicalDatabaseDriver;
  private readonly lockTimeoutMs: number;

  constructor(driver: IPhysicalDatabaseDriver, lockTimeoutMs: number = 30000) {
    this.driver = driver;
    this.lockTimeoutMs = lockTimeoutMs;
  }

  public async initLockTable(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS _proofix_migration_locks (
        lock_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `;
    await this.driver.execute(ddl);
  }

  public async acquireLock(ownerId: string): Promise<boolean> {
    await this.initLockTable();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + this.lockTimeoutMs).toISOString();

    // Check if active lock exists
    const checkSql = `SELECT lock_id, owner_id, expires_at FROM _proofix_migration_locks WHERE lock_id = 'global_migration_lock';`;
    const res = await this.driver.query<{ lock_id: string; owner_id: string; expires_at: string }>(checkSql);

    if (res.rows.length > 0) {
      const activeLock = res.rows[0];
      const expiry = new Date(activeLock.expires_at).getTime();
      if (expiry > now.getTime() && activeLock.owner_id !== ownerId) {
        // Lock currently held by another worker
        return false;
      }
      // Stale or self-owned: renew
      const updateSql = `
        UPDATE _proofix_migration_locks
        SET owner_id = ?, acquired_at = ?, expires_at = ?
        WHERE lock_id = 'global_migration_lock';
      `;
      await this.driver.execute(updateSql, [ownerId, nowIso, expiresIso]);
      return true;
    }

    // Insert new lock
    const insertSql = `
      INSERT INTO _proofix_migration_locks (lock_id, owner_id, acquired_at, expires_at)
      VALUES ('global_migration_lock', ?, ?, ?);
    `;
    await this.driver.execute(insertSql, [ownerId, nowIso, expiresIso]);
    return true;
  }

  public async releaseLock(ownerId: string): Promise<void> {
    try {
      const sql = `DELETE FROM _proofix_migration_locks WHERE lock_id = 'global_migration_lock' AND owner_id = ?;`;
      await this.driver.execute(sql, [ownerId]);
    } catch {
      // Ignore if table doesn't exist
    }
  }
}
