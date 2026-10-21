/**
 * Pluggable Database Adapter Factory & Connection Health Manager (Contribution 216)
 *
 * Dynamically resolves, instantiates, and manages connection health for
 * PostgreSQL, SQLite, and Turso physical database adapters based on environment URIs.
 */

import type { IDatabaseAdapter, DatabaseDialect } from '../types/database-adapters.ts';
import { PostgresAdapter } from './postgres-adapter.ts';
import { SqliteAdapter } from './sqlite-adapter.ts';

export interface DatabaseHealthStatus {
  dialect: DatabaseDialect;
  connected: boolean;
  latencyMs: number;
  uriRedacted: string;
  healthy: boolean;
  timestamp: string;
  error?: string;
}

export class DatabaseAdapterFactory {
  private activeAdapter?: IDatabaseAdapter;

  /**
   * Redacts credentials from connection string for security compliance.
   */
  public redactUri(uri: string): string {
    try {
      const parsed = new URL(uri);
      if (parsed.password || parsed.username) {
        parsed.username = '***';
        parsed.password = '***';
        return parsed.toString();
      }
    } catch {
      // fallback
    }
    return uri.replace(/\/\/.+@/, '//***:***@');
  }

  /**
   * Resolves the appropriate database adapter for the given connection URI.
   */
  public createAdapter(connectionUri?: string): IDatabaseAdapter {
    const uri = connectionUri || process.env.DATABASE_URL || 'file:./proofix.db';

    if (uri.startsWith('postgres://') || uri.startsWith('postgresql://')) {
      return new PostgresAdapter({ connectionUrl: uri });
    }

    if (
      uri.startsWith('file:') ||
      uri.startsWith('sqlite:') ||
      uri.startsWith('libsql://') ||
      uri === ':memory:'
    ) {
      return new SqliteAdapter({ connectionUrl: uri });
    }

    // Default to embedded SQLite
    return new SqliteAdapter({ connectionUrl: uri });
  }

  /**
   * Returns a singleton or active database adapter for the application.
   */
  public getOrInitializeAdapter(connectionUri?: string): IDatabaseAdapter {
    if (!this.activeAdapter) {
      this.activeAdapter = this.createAdapter(connectionUri);
    }
    return this.activeAdapter;
  }

  /**
   * Performs an end-to-end ping and health check against the active database.
   */
  public async checkHealth(adapter?: IDatabaseAdapter): Promise<DatabaseHealthStatus> {
    const target = adapter || this.getOrInitializeAdapter();
    const uri = (target as any).getConfig?.()?.connectionUrl || 'internal';
    const uriRedacted = this.redactUri(uri);

    const start = Date.now();
    try {
      if (!target.isConnected()) {
        await target.connect();
      }
      const res = await target.query('SELECT 1 AS HEALTH_CHECK');
      const latencyMs = Date.now() - start;

      return {
        dialect: target.dialect,
        connected: target.isConnected(),
        latencyMs,
        uriRedacted,
        healthy: res.rowCount >= 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        dialect: target.dialect,
        connected: false,
        latencyMs: Date.now() - start,
        uriRedacted,
        healthy: false,
        error: err?.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public reset(): void {
    if (this.activeAdapter) {
      this.activeAdapter.disconnect().catch(() => {});
      this.activeAdapter = undefined;
    }
  }
}

export const globalDatabaseAdapterFactory = new DatabaseAdapterFactory();
