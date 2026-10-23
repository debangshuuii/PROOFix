/**
 * Native SQLite Physical Database Driver
 *
 * Implements full IPhysicalDatabaseDriver using Node.js built-in DatabaseSync
 * with WAL mode, foreign keys, statement caching, and transactions.
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  IPhysicalDatabaseDriver,
  DatabaseDialect,
  DatabaseEngineConfig,
  DatabaseHealthStatus,
  QueryExecutionResult,
  StatementExecutionResult,
  ITransactionSession,
  TransactionIsolationLevel,
} from '../types/pluggable-database.ts';
import { SqliteConnectionManager } from './sqlite-connection-manager.ts';
import { applySqlitePragmas } from './sqlite-pragmas.ts';
import { SqliteStatementCache } from './sqlite-statement-cache.ts';
import { SqliteTransactionSession } from './sqlite-transaction-session.ts';

export class NativeSqliteDriver implements IPhysicalDatabaseDriver {
  public readonly dialect: DatabaseDialect = 'sqlite';
  private connectionManager: SqliteConnectionManager;
  private db: DatabaseSync | null = null;
  private stmtCache: SqliteStatementCache | null = null;
  private pragmasApplied: string[] = [];

  constructor(config?: Partial<DatabaseEngineConfig>) {
    this.connectionManager = new SqliteConnectionManager(config);
  }

  public static createInMemoryDriver(config?: Partial<DatabaseEngineConfig>): NativeSqliteDriver {
    return new NativeSqliteDriver({
      ...config,
      connectionUrl: ':memory:',
      walMode: false,
    });
  }

  public static createFileDriver(
    filePath: string = './data/proofix.db',
    config?: Partial<DatabaseEngineConfig>
  ): NativeSqliteDriver {
    return new NativeSqliteDriver({
      ...config,
      connectionUrl: filePath.startsWith('file:') ? filePath : `file:${filePath}`,
      walMode: true,
    });
  }

  public async connect(): Promise<void> {
    if (this.db) return;

    this.db = this.connectionManager.open();
    const isMemory = this.connectionManager.getResolvedPath() === ':memory:';
    this.pragmasApplied = applySqlitePragmas(this.db, this.connectionManager.getConfig(), isMemory);
    this.stmtCache = new SqliteStatementCache(this.db);
  }

  public async disconnect(): Promise<void> {
    if (this.stmtCache) {
      this.stmtCache.clear();
      this.stmtCache = null;
    }
    this.connectionManager.close();
    this.db = null;
  }

  public isConnected(): boolean {
    return this.db !== null;
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryExecutionResult<T>> {
    if (!this.db || !this.stmtCache) {
      await this.connect();
    }

    const start = Date.now();
    const stmt = this.stmtCache!.get(sql);
    const rows = stmt.all(...(params as any[])) as T[];
    const durationMs = Date.now() - start;

    return {
      rows,
      rowCount: rows.length,
      durationMs,
      command: sql.trim().split(' ')[0].toUpperCase(),
    };
  }

  public async execute(sql: string, params: unknown[] = []): Promise<StatementExecutionResult> {
    if (!this.db || !this.stmtCache) {
      await this.connect();
    }

    const start = Date.now();
    const trimmed = sql.trim();
    let changes = 0;
    let lastInsertRowId: number | bigint | undefined;

    // Support multi-statement scripts (e.g. DDL with multiple semicolons)
    if (params.length === 0 && trimmed.includes(';')) {
      this.db!.exec(trimmed);
      changes = 1;
    } else {
      const stmt = this.stmtCache!.get(trimmed);
      const res = stmt.run(...(params as any[]));
      changes = Number(res.changes);
      lastInsertRowId = res.lastInsertRowid;
    }

    const durationMs = Date.now() - start;
    return {
      changes,
      lastInsertRowId,
      durationMs,
    };
  }

  public async beginTransaction(
    isolationLevel?: TransactionIsolationLevel
  ): Promise<ITransactionSession> {
    if (!this.db || !this.stmtCache) {
      await this.connect();
    }
    return new SqliteTransactionSession(this.db!, this.stmtCache!, isolationLevel);
  }

  public async getHealth(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    try {
      if (!this.isConnected()) {
        await this.connect();
      }

      const res = await this.query<{ health: number }>('SELECT 1 as health;');
      const latencyMs = Date.now() - start;
      const isWal = this.pragmasApplied.some((p) => p.includes('WAL'));

      return {
        healthy: res.rowCount > 0,
        dialect: this.dialect,
        latencyMs,
        activeConnections: 1,
        idleConnections: 0,
        walModeEnabled: isWal,
        readOnly: false,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        healthy: false,
        dialect: this.dialect,
        latencyMs: Date.now() - start,
        activeConnections: 0,
        idleConnections: 0,
        walModeEnabled: false,
        readOnly: true,
        lastCheckedAt: new Date().toISOString(),
        error: (err as Error).message,
      };
    }
  }

  public getConfig(): DatabaseEngineConfig {
    return this.connectionManager.getConfig();
  }

  public getExecutedPragmas(): string[] {
    return [...this.pragmasApplied];
  }
}

export const globalSqliteDriver = new NativeSqliteDriver();
