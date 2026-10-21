/**
 * Pluggable Physical Database Adapters & Migration Types (Contribution 211)
 *
 * Provides vendor-neutral interfaces for PostgreSQL (pg) and SQLite/Turso (@libsql/client)
 * database adapters, schema migrations, and transactional isolation.
 */

export type DatabaseDialect = 'postgres' | 'sqlite' | 'memory';

export interface DatabaseAdapterConfig {
  dialect: DatabaseDialect;
  connectionUrl?: string; // e.g. postgresql://user:pass@localhost:5432/proofix or file:./proofix.db
  maxConnections?: number;
  idleTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
  walMode?: boolean; // SQLite write-ahead logging
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  durationMs: number;
}

export interface TransactionSession {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface IDatabaseAdapter {
  readonly dialect: DatabaseDialect;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  beginTransaction(): Promise<TransactionSession>;
  runMigrations?(migrationDir?: string): Promise<MigrationExecutionResult>;
}

export interface MigrationScript {
  id: string; // e.g. '001_initial_schema'
  version: number;
  description: string;
  upSql: string;
  downSql?: string;
  checksum: string;
}

export interface MigrationRecord {
  version: number;
  id: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
}

export interface MigrationExecutionResult {
  appliedCount: number;
  pendingCount: number;
  currentVersion: number;
  migrations: MigrationRecord[];
}
