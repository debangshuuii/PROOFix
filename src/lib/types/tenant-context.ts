/**
 * Multi-Tenant Context & Organization Boundary Schemas
 *
 * Defines contracts for strict tenant isolation, role-based boundary guards,
 * and tenant-aware entity bindings.
 */

export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer' | 'service_account';

export interface TenantContext {
  tenantId: string;
  organizationId: string;
  userId: string;
  role: TenantRole;
  permissions: string[];
  isSystemAdmin?: boolean;
}

export interface TenantIsolationBoundary {
  enforceStrictPartitioning: boolean;
  allowedTenantIds?: string[];
  enableCrossTenantAuditing: boolean;
}

export interface TenantScopedEntity {
  tenantId: string;
  organizationId?: string;
}

export class TenantViolationError extends Error {
  public readonly requestedTenantId: string;
  public readonly contextTenantId: string;
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(params: {
    requestedTenantId: string;
    contextTenantId: string;
    resourceType: string;
    resourceId?: string;
    message?: string;
  }) {
    const msg =
      params.message ||
      `Cross-tenant access violation: Tenant "${params.contextTenantId}" cannot access ${params.resourceType} "${params.resourceId || 'unknown'}" owned by tenant "${params.requestedTenantId}".`;
    super(msg);
    this.name = 'TenantViolationError';
    this.requestedTenantId = params.requestedTenantId;
    this.contextTenantId = params.contextTenantId;
    this.resourceType = params.resourceType;
    this.resourceId = params.resourceId;
  }
}

export const DEFAULT_SYSTEM_TENANT_ID = 'tenant_system_default';
export const DEFAULT_SYSTEM_ORG_ID = 'org_system_default';

export function createDefaultTenantContext(overrides?: Partial<TenantContext>): TenantContext {
  return {
    tenantId: overrides?.tenantId || DEFAULT_SYSTEM_TENANT_ID,
    organizationId: overrides?.organizationId || DEFAULT_SYSTEM_ORG_ID,
    userId: overrides?.userId || 'usr_system',
    role: overrides?.role || 'owner',
    permissions: overrides?.permissions || ['*'],
    isSystemAdmin: overrides?.isSystemAdmin ?? true,
  };
}
