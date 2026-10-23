/**
 * Multi-Tenant Partition Orchestrator
 *
 * Coordinates tenant-scoped consistent hash distribution,
 * shard lookup, and schema routing across cluster storage nodes.
 */

import { TenantPartitioningRouter } from '../db/tenant-partitioning.ts';
import type { TenantContext } from '../types/tenant-context.ts';
import { TenantGuard } from './tenant-guard.ts';
import { TenantQueryRewriter } from './tenant-query-rewriter.ts';

export class TenantPartitionOrchestrator {
  private router: TenantPartitioningRouter;

  constructor(router?: TenantPartitioningRouter) {
    this.router = router || new TenantPartitioningRouter();
  }

  public getRouter(): TenantPartitioningRouter {
    return this.router;
  }

  public prepareScopedQuery(
    context: TenantContext,
    sql: string,
    params: unknown[] = []
  ): { shardId: string; rewrittenSql: string; rewrittenParams: unknown[] } {
    TenantGuard.assertOwnership(context.tenantId, context, 'DatabaseQuery');

    const shard = this.router.resolveShardForTenant(context.tenantId);
    const { sql: rewrittenSql, params: rewrittenParams } = TenantQueryRewriter.injectTenantFilter(
      sql,
      params,
      context.tenantId
    );

    return {
      shardId: shard.shardId,
      rewrittenSql,
      rewrittenParams,
    };
  }

  public resolveShardId(tenantId: string): string {
    return this.router.resolveShardForTenant(tenantId).shardId;
  }
}
