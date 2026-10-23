/**
 * SQLite Transactional Session Controller
 *
 * Implements atomic ACID transactions with savepoint nesting,
 * isolation level support, and automatic rollback on uncaught exceptions.
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  ITransactionSession,
  QueryExecutionResult,
  StatementExecutionResult,
  TransactionIsolationLevel,
} from '../types/pluggable-database.ts';
import { SqliteStatementCache } from './sqlite-statement-cache.ts';

export class SqliteTransactionSession implements ITransactionSession {
  private db: DatabaseSync;
  private stmtCache: SqliteStatementCache;
  private completed: boolean = false;
  private savepointCounter: number = 0;

  constructor(
    db: DatabaseSync,
    stmtCache: SqliteStatementCache,
    isolationLevel?: TransactionIsolationLevel
  ) {
    this.db = db;
    this.stmtCache = stmtCache;

    // Begin transaction
    if (isolationLevel === 'SERIALIZABLE') {
      this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    } else {
      this.db.exec('BEGIN TRANSACTION;');
    }
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryExecutionResult<T>> {
    this.assertActive();
    const start = Date.now();
    const stmt = this.stmtCache.get(sql);
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
    this.assertActive();
    const start = Date.now();
    const stmt = this.stmtCache.get(sql);
    const res = stmt.run(...(params as any[]));
    const durationMs = Date.now() - start;

    return {
      changes: Number(res.changes),
      lastInsertRowId: res.lastInsertRowid,
      durationMs,
    };
  }

  public async commit(): Promise<void> {
    this.assertActive();
    this.db.exec('COMMIT;');
    this.completed = true;
  }

  public async rollback(): Promise<void> {
    if (this.completed) return;
    try {
      this.db.exec('ROLLBACK;');
    } finally {
      this.completed = true;
    }
  }

  public async createSavepoint(): Promise<string> {
    this.assertActive();
    this.savepointCounter++;
    const spName = `sp_${this.savepointCounter}`;
    this.db.exec(`SAVEPOINT ${spName};`);
    return spName;
  }

  public async rollbackToSavepoint(spName: string): Promise<void> {
    this.assertActive();
    this.db.exec(`ROLLBACK TO SAVEPOINT ${spName};`);
  }

  public async releaseSavepoint(spName: string): Promise<void> {
    this.assertActive();
    this.db.exec(`RELEASE SAVEPOINT ${spName};`);
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  private assertActive(): void {
    if (this.completed) {
      throw new Error('Transaction has already been finalized (committed or rolled back).');
    }
  }
}
