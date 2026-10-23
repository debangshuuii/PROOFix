/**
 * Native PostgreSQL Physical Database Driver
 *
 * Implements IPhysicalDatabaseDriver with pooled connections,
 * transient failure retry backoff, health monitoring, and transaction sessions.
 */

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
import { DatabaseConnectionPool } from '../db/connection-pool.ts';
import { PostgresQueryBridge } from './postgres-connection-pool-bridge.ts';
import { PostgresPoolHealthMonitor } from './postgres-pool-health.ts';
import { PostgresTransactionSession } from './postgres-transaction-session.ts';

export class NativePostgresDriver implements IPhysicalDatabaseDriver {
  public readonly dialect: DatabaseDialect = 'postgres';
  private config: DatabaseEngineConfig;
  private pool: DatabaseConnectionPool;
  private queryBridge: PostgresQueryBridge;
  private healthMonitor: PostgresPoolHealthMonitor;
  private connected: boolean = false;

  constructor(config?: Partial<DatabaseEngineConfig>) {
    this.config = {
      dialect: 'postgres',
      connectionUrl: config?.connectionUrl || 'postgresql://postgres:postgres@localhost:5432/proofix',
      maxPoolSize: config?.maxPoolSize || 10,
      minPoolSize: config?.minPoolSize || 2,
      idleTimeoutMs: config?.idleTimeoutMs || 30000,
      connectionTimeoutMs: config?.connectionTimeoutMs || 5000,
      ssl: config?.ssl ?? false,
      ...config,
    };

    this.pool = new DatabaseConnectionPool({
      maxConnections: this.config.maxPoolSize,
      minConnections: this.config.minPoolSize,
      idleTimeoutMs: this.config.idleTimeoutMs,
      connectionTimeoutMs: this.config.connectionTimeoutMs,
    });

    this.queryBridge = new PostgresQueryBridge(this.pool);
    this.healthMonitor = new PostgresPoolHealthMonitor(this.pool);
  }

  public async connect(): Promise<void> {
    this.connected = true;
    await this.healthMonitor.keepalive();
  }

  public async disconnect(): Promise<void> {
    this.pool.close();
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryExecutionResult<T>> {
    if (!this.connected) {
      await this.connect();
    }
    return this.executeWithRetry(() => this.queryBridge.executeQuery<T>(sql, params));
  }

  public async execute(sql: string, params: unknown[] = []): Promise<StatementExecutionResult> {
    if (!this.connected) {
      await this.connect();
    }
    return this.executeWithRetry(() => this.queryBridge.executeStatement(sql, params));
  }

  public async beginTransaction(
    isolationLevel?: TransactionIsolationLevel
  ): Promise<ITransactionSession> {
    if (!this.connected) {
      await this.connect();
    }
    const conn = await this.pool.acquire();
    const session = new PostgresTransactionSession(this.pool, conn, isolationLevel);
    await session.init();
    return session;
  }

  public async getHealth(): Promise<DatabaseHealthStatus> {
    return this.healthMonitor.checkHealth();
  }

  public getConfig(): DatabaseEngineConfig {
    return { ...this.config };
  }

  public getPool(): DatabaseConnectionPool {
    return this.pool;
  }

  /**
   * Retries transient database errors with exponential backoff and jitter.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        const isTransient =
          err?.message?.includes('ECONNRESET') ||
          err?.message?.includes('ETIMEDOUT') ||
          err?.message?.includes('deadlock detected') ||
          err?.message?.includes('Connection timeout');

        if (!isTransient || attempt >= maxRetries) {
          throw err;
        }

        const delay = Math.min(1000, Math.pow(2, attempt) * 50 + Math.random() * 50);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}

export const globalPostgresDriver = new NativePostgresDriver();
