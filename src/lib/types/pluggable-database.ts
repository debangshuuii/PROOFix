/**
 * Pluggable Database & Persistence Engine Core Contracts
 *
 * Defines multi-engine database dialects, engine configuration,
 * health status schemas, and physical driver interfaces.
 */

export type DatabaseDialect = 'sqlite' | 'postgres' | 'memory' | 'json';

export type TransactionIsolationLevel =
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE';

export interface DatabaseEngineConfig {
  dialect: DatabaseDialect;
  connectionUrl?: string;
  walMode?: boolean;
  busyTimeoutMs?: number;
  synchronousMode?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  maxPoolSize?: number;
  minPoolSize?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
  isolationLevel?: TransactionIsolationLevel;
  storageFilePath?: string;
  enableForeignKeys?: boolean;
}

export interface DatabaseHealthStatus {
  healthy: boolean;
  dialect: DatabaseDialect;
  latencyMs: number;
  activeConnections: number;
  idleConnections: number;
  walModeEnabled: boolean;
  readOnly: boolean;
  lastCheckedAt: string;
  error?: string;
}

export interface QueryExecutionResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  durationMs: number;
  command: string;
}

export interface StatementExecutionResult {
  changes: number;
  lastInsertRowId?: number | bigint;
  durationMs: number;
}

export interface ITransactionSession {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryExecutionResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<StatementExecutionResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isCompleted(): boolean;
}

export interface IPhysicalDatabaseDriver {
  readonly dialect: DatabaseDialect;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryExecutionResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<StatementExecutionResult>;
  beginTransaction(isolationLevel?: TransactionIsolationLevel): Promise<ITransactionSession>;
  getHealth(): Promise<DatabaseHealthStatus>;
  getConfig(): DatabaseEngineConfig;
}
