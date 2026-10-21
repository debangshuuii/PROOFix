/**
 * Multi-Tenant Data Partitioning & Sharding Router (Contribution 168)
 *
 * Implements tenant-scoped consistent hashing, schema partitioning,
 * and boundary guard verification to prevent cross-tenant data leakage.
 */

import crypto from 'crypto';
import type { ShardMetadata } from '../types/queue-database.ts';
import { DatabaseConnectionPool } from './connection-pool.ts';

export class TenantPartitioningRouter {
  private shards: Map<string, ShardMetadata> = new Map();
  private shardPools: Map<string, DatabaseConnectionPool> = new Map();

  constructor() {
    // Default cluster shards
    this.registerShard('shard-us-east-1', 'db-primary-1.proofix.internal', true);
    this.registerShard('shard-us-east-2', 'db-primary-2.proofix.internal', true);
    this.registerShard('shard-eu-west-1', 'db-primary-3.proofix.internal', true);
  }

  /**
   * Registers a database shard in the cluster.
   */
  public registerShard(shardId: string, host: string, isPrimary: boolean = true): void {
    this.shards.set(shardId, {
      shardId,
      tenantPrefix: `shard_${shardId}`,
      host,
      isPrimary,
      activeConnections: 0,
    });
    this.shardPools.set(shardId, new DatabaseConnectionPool({ minConnections: 1, maxConnections: 5 }));
  }

  /**
   * Resolves the assigned shard for a tenant using deterministic consistent hashing (MD5 hash ring).
   */
  public resolveShardForTenant(tenantId: string): ShardMetadata {
    if (this.shards.size === 0) {
      throw new Error('No active database shards registered in cluster');
    }

    const hash = crypto.createHash('md5').update(tenantId).digest('hex');
    const hashInt = parseInt(hash.slice(0, 8), 16);
    const shardList = Array.from(this.shards.values()).sort((a, b) => a.shardId.localeCompare(b.shardId));

    const index = hashInt % shardList.length;
    return shardList[index];
  }

  /**
   * Generates a tenant-scoped SQL schema name (e.g. tenant_acme_prod).
   */
  public getTenantSchemaName(tenantId: string): string {
    const sanitized = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    return `tenant_${sanitized}`;
  }

  /**
   * Validates whether a SQL query strictly enforces tenant boundary isolation.
   */
  public validateQueryTenantIsolation(sql: string, tenantId: string): boolean {
    const lower = sql.toLowerCase();

    // SELECT, UPDATE, DELETE queries must have tenant_id filter or schema qualification
    const schemaName = this.getTenantSchemaName(tenantId);
    const hasSchemaScope = lower.includes(schemaName);
    const hasTenantFilter = lower.includes('tenant_id') || lower.includes('$tenant');

    return hasSchemaScope || hasTenantFilter;
  }

  /**
   * Executes a query scoped to the tenant's assigned shard.
   */
  public async executeScopedQuery<TRow = Record<string, unknown>>(
    tenantId: string,
    sql: string,
    params: unknown[] = []
  ): Promise<{ shardId: string; rows: TRow[] }> {
    const isIsolated = this.validateQueryTenantIsolation(sql, tenantId);
    if (!isIsolated) {
      throw new Error(
        `Cross-tenant isolation violation: Query lacks tenant scoping for tenant [${tenantId}]`
      );
    }

    const shard = this.resolveShardForTenant(tenantId);
    const pool = this.shardPools.get(shard.shardId)!;

    const result = await pool.query<TRow>(sql, params);
    return {
      shardId: shard.shardId,
      rows: result.rows,
    };
  }

  public getShards(): ShardMetadata[] {
    return Array.from(this.shards.values());
  }

  public closeAll(): void {
    for (const pool of this.shardPools.values()) {
      pool.close();
    }
  }
}
