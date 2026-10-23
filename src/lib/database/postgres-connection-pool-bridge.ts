/**
 * PostgreSQL Client Adapter & Parameterized Query Bridge
 *
 * Implements high-throughput PostgreSQL query execution with
 * positional parameters ($1, $2, ...), command parsing, and connection leasing.
 */

import type { QueryExecutionResult, StatementExecutionResult } from '../types/pluggable-database.ts';
import { DatabaseConnectionPool, type DbConnection } from '../db/connection-pool.ts';

export class PostgresQueryBridge {
  private pool: DatabaseConnectionPool;

  constructor(pool: DatabaseConnectionPool) {
    this.pool = pool;
  }

  public async executeQuery<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
    connection?: DbConnection
  ): Promise<QueryExecutionResult<T>> {
    const start = Date.now();
    const command = sql.trim().split(' ')[0].toUpperCase();

    const res = await this.pool.query<T>(sql, params, connection);
    const durationMs = Date.now() - start;

    return {
      rows: res.rows,
      rowCount: res.rowCount,
      durationMs,
      command,
    };
  }

  public async executeStatement(
    sql: string,
    params: unknown[] = [],
    connection?: DbConnection
  ): Promise<StatementExecutionResult> {
    const start = Date.now();
    const res = await this.pool.query(sql, params, connection);
    const durationMs = Date.now() - start;

    return {
      changes: res.rowCount,
      durationMs,
    };
  }

  public getPool(): DatabaseConnectionPool {
    return this.pool;
  }
}
