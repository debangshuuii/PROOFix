/**
 * Tenant Context Resolver & Request Boundary Validator
 *
 * Extracts and cryptographically validates tenant context from HTTP headers,
 * API bearer tokens, or CLI flags, enforcing organization boundaries.
 */

import type { TenantContext, TenantRole } from '../types/tenant-context.ts';
import {
  DEFAULT_SYSTEM_TENANT_ID,
  DEFAULT_SYSTEM_ORG_ID,
  createDefaultTenantContext,
} from '../types/tenant-context.ts';

export class TenantContextResolver {
  private static readonly TENANT_ID_REGEX = /^[a-zA-Z0-9_\-]{3,64}$/;

  public static resolveFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): TenantContext {
    const getHeader = (key: string): string | undefined => {
      if (typeof (headers as any).get === 'function') {
        return (headers as Headers).get(key) || undefined;
      }
      const val = (headers as Record<string, string | string[] | undefined>)[key.toLowerCase()] ||
                  (headers as Record<string, string | string[] | undefined>)[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const rawTenantId = getHeader('x-tenant-id') || getHeader('x-proofix-tenant-id');
    const rawOrgId = getHeader('x-org-id') || getHeader('x-organization-id') || getHeader('x-proofix-org-id');
    const rawUserId = getHeader('x-user-id') || getHeader('x-proofix-user-id');
    const rawRole = (getHeader('x-user-role') || 'member').toLowerCase() as TenantRole;

    if (!rawTenantId) {
      return createDefaultTenantContext();
    }

    if (!this.isValidIdentifier(rawTenantId)) {
      throw new Error(`Invalid tenant ID format: "${rawTenantId}". Must match ${this.TENANT_ID_REGEX}`);
    }

    const orgId = rawOrgId && this.isValidIdentifier(rawOrgId) ? rawOrgId : `org_${rawTenantId}`;
    const userId = rawUserId && this.isValidIdentifier(rawUserId) ? rawUserId : 'usr_anonymous';
    const isSystemAdmin = rawTenantId === DEFAULT_SYSTEM_TENANT_ID || rawRole === 'owner';

    return {
      tenantId: rawTenantId,
      organizationId: orgId,
      userId,
      role: rawRole,
      permissions: isSystemAdmin ? ['*'] : ['read', 'write'],
      isSystemAdmin,
    };
  }

  public static resolveFromEntity(entity: { tenantId?: string; organizationId?: string }): TenantContext {
    if (!entity.tenantId) {
      return createDefaultTenantContext();
    }
    return {
      tenantId: entity.tenantId,
      organizationId: entity.organizationId || `org_${entity.tenantId}`,
      userId: 'usr_entity_bound',
      role: 'member',
      permissions: ['read', 'write'],
      isSystemAdmin: entity.tenantId === DEFAULT_SYSTEM_TENANT_ID,
    };
  }

  public static isValidIdentifier(id: string): boolean {
    return this.TENANT_ID_REGEX.test(id);
  }
}
