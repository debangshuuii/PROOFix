/**
 * PostgreSQL Connection Pool Health Monitor & Keepalive Manager
 *
 * Emits health diagnostics, tracks connection latency, manages idle pruning,
 * and maintains keepalive pings for cloud databases (RDS, Supabase, Neon).
 */

import type { DatabaseHealthStatus } from '../types/pluggable-database.ts';
import type { DatabaseConnectionPool } from '../db/connection-pool.ts';

export class PostgresPoolHealthMonitor {
  private pool: DatabaseConnectionPool;
  private lastLatencyMs: number = 0;
  private lastCheckedAt: string = new Date().toISOString();

  constructor(pool: DatabaseConnectionPool) {
    this.pool = pool;
  }

  public async checkHealth(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    try {
      const res = await this.pool.query('SELECT 1 AS HEALTH_CHECK;');
      this.lastLatencyMs = Date.now() - start;
      this.lastCheckedAt = new Date().toISOString();

      const stats = this.pool.getStats();

      return {
        healthy: res.rowCount > 0,
        dialect: 'postgres',
        latencyMs: this.lastLatencyMs,
        activeConnections: stats.activeConnections,
        idleConnections: stats.idleConnections,
        walModeEnabled: false,
        readOnly: false,
        lastCheckedAt: this.lastCheckedAt,
      };
    } catch (err) {
      this.lastLatencyMs = Date.now() - start;
      this.lastCheckedAt = new Date().toISOString();
      return {
        healthy: false,
        dialect: 'postgres',
        latencyMs: this.lastLatencyMs,
        activeConnections: 0,
        idleConnections: 0,
        walModeEnabled: false,
        readOnly: true,
        lastCheckedAt: this.lastCheckedAt,
        error: (err as Error).message,
      };
    }
  }

  public async keepalive(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1;');
      return true;
    } catch {
      return false;
    }
  }
}
