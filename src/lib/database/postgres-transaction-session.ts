/**
 * PostgreSQL Transactional Session Controller
 *
 * Implements transaction sessions with explicit isolation level configuration
 * (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) and dedicated connection scoping.
 */

import type {
  ITransactionSession,
  QueryExecutionResult,
  StatementExecutionResult,
  TransactionIsolationLevel,
} from '../types/pluggable-database.ts';
import type { DatabaseConnectionPool, DbConnection } from '../db/connection-pool.ts';

export class PostgresTransactionSession implements ITransactionSession {
  private pool: DatabaseConnectionPool;
  private connection: DbConnection;
  private completed: boolean = false;
  private isolationLevel: TransactionIsolationLevel;

  constructor(
    pool: DatabaseConnectionPool,
    connection: DbConnection,
    isolationLevel: TransactionIsolationLevel = 'READ_COMMITTED'
  ) {
    this.pool = pool;
    this.connection = connection;
    this.isolationLevel = isolationLevel;
  }

  public async init(): Promise<void> {
    await this.pool.query('BEGIN;', [], this.connection);
    if (this.isolationLevel !== 'READ_COMMITTED') {
      await this.pool.query(
        `SET TRANSACTION ISOLATION LEVEL ${this.isolationLevel};`,
        [],
        this.connection
      );
    }
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryExecutionResult<T>> {
    this.assertActive();
    const start = Date.now();
    const res = await this.pool.query<T>(sql, params, this.connection);
    const durationMs = Date.now() - start;

    return {
      rows: res.rows,
      rowCount: res.rowCount,
      durationMs,
      command: sql.trim().split(' ')[0].toUpperCase(),
    };
  }

  public async execute(sql: string, params: unknown[] = []): Promise<StatementExecutionResult> {
    this.assertActive();
    const start = Date.now();
    const res = await this.pool.query(sql, params, this.connection);
    const durationMs = Date.now() - start;

    return {
      changes: res.rowCount,
      durationMs,
    };
  }

  public async commit(): Promise<void> {
    this.assertActive();
    try {
      await this.pool.query('COMMIT;', [], this.connection);
    } finally {
      this.completed = true;
      this.pool.release(this.connection);
    }
  }

  public async rollback(): Promise<void> {
    if (this.completed) return;
    try {
      await this.pool.query('ROLLBACK;', [], this.connection);
    } finally {
      this.completed = true;
      this.pool.release(this.connection);
    }
  }

  public isCompleted(): boolean {
    return this.completed;
  }

  private assertActive(): void {
    if (this.completed) {
      throw new Error('PostgreSQL transaction session has already been finalized.');
    }
  }
}
