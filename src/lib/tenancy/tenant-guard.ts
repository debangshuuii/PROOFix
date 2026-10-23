/**
 * Cross-Tenant Mutation Firewall & Ownership Guard
 *
 * Enforces strict zero-trust boundary verification on entity reads, writes,
 * mutations, and deletions, neutralizing cross-tenant data leaks.
 */

import type { TenantContext, TenantScopedEntity } from '../types/tenant-context.ts';
import { TenantViolationError } from '../types/tenant-context.ts';

export class TenantGuard {
  public static assertOwnership(
    entityTenantId: string,
    context: TenantContext,
    resourceType: string,
    resourceId?: string
  ): void {
    if (context.isSystemAdmin) {
      return;
    }

    if (entityTenantId !== context.tenantId) {
      throw new TenantViolationError({
        requestedTenantId: entityTenantId,
        contextTenantId: context.tenantId,
        resourceType,
        resourceId,
      });
    }
  }

  public static filterAllowedEntities<T extends TenantScopedEntity>(
    entities: T[],
    context: TenantContext
  ): T[] {
    if (context.isSystemAdmin) {
      return entities;
    }
    return entities.filter((e) => e.tenantId === context.tenantId);
  }

  public static bindEntity<T extends Record<string, unknown>>(
    entity: T,
    context: TenantContext
  ): T & TenantScopedEntity {
    return {
      ...entity,
      tenantId: context.tenantId,
      organizationId: (entity as any).organizationId || context.organizationId,
    };
  }
}
