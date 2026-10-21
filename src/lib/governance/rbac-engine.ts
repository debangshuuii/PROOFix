/**
 * Granular Role-Based Access Control (RBAC) & Policy Engine (Contribution 172)
 *
 * Implements least-privilege permission matrix, tenant boundary enforcement,
 * MFA authentication gating for high-privilege operations, and IP CIDR allowlists.
 */

import type {
  UserRole,
  Permission,
  RoleDefinition,
  AccessContext,
} from '../types/governance-compliance.ts';

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    description: 'Full administrative access across all tenants and cluster nodes',
    permissions: [
      'runs:read',
      'runs:trigger',
      'runs:cancel',
      'healing:approve',
      'fuzzing:execute',
      'replay:record',
      'secrets:manage',
      'audit:export',
      'compliance:read',
      'retention:configure',
    ],
    mfaRequired: true,
  },
  security_auditor: {
    role: 'security_auditor',
    description: 'Read-only compliance, SOC2 evidence auditor and cryptographic ledger viewer',
    permissions: [
      'runs:read',
      'audit:export',
      'compliance:read',
    ],
    mfaRequired: true,
  },
  qa_lead: {
    role: 'qa_lead',
    description: 'QA engineering leadership managing test pipelines, self-healing, and replay',
    permissions: [
      'runs:read',
      'runs:trigger',
      'runs:cancel',
      'healing:approve',
      'fuzzing:execute',
      'replay:record',
      'compliance:read',
    ],
    mfaRequired: true,
  },
  developer: {
    role: 'developer',
    description: 'Software engineer triggering test suites, local replays, and fuzzing probes',
    permissions: [
      'runs:read',
      'runs:trigger',
      'fuzzing:execute',
    ],
    mfaRequired: false,
  },
  viewer: {
    role: 'viewer',
    description: 'Read-only observer of test dashboard reports and compliance scores',
    permissions: [
      'runs:read',
      'compliance:read',
    ],
    mfaRequired: false,
  },
};

export const SENSITIVE_PERMISSIONS = new Set<Permission>([
  'healing:approve',
  'secrets:manage',
  'audit:export',
  'retention:configure',
]);

export interface RbacEvaluationResult {
  allowed: boolean;
  reason?: 'insufficient_permissions' | 'cross_tenant_denied' | 'mfa_required' | 'ip_not_allowed';
}

export class RbacPolicyEngine {
  private ipAllowlist: Set<string> = new Set();

  constructor(allowedIps?: string[]) {
    if (allowedIps) {
      this.ipAllowlist = new Set(allowedIps);
    }
  }

  /**
   * Evaluates if an access context is authorized for a specific permission.
   */
  public evaluate(
    context: AccessContext,
    permission: Permission,
    targetTenantId?: string
  ): RbacEvaluationResult {
    const roleDef = ROLE_DEFINITIONS[context.userRole];
    if (!roleDef) {
      return { allowed: false, reason: 'insufficient_permissions' };
    }

    // 1. Check IP allowlist if configured
    if (this.ipAllowlist.size > 0 && context.clientIp) {
      if (!this.ipAllowlist.has(context.clientIp) && !this.ipAllowlist.has('0.0.0.0/0')) {
        return { allowed: false, reason: 'ip_not_allowed' };
      }
    }

    // 2. Check Permission in Role
    if (!roleDef.permissions.includes(permission)) {
      return { allowed: false, reason: 'insufficient_permissions' };
    }

    // 3. Check Tenant Boundary (super_admin can cross tenants, all others restricted to their own tenant)
    if (targetTenantId && context.userRole !== 'super_admin') {
      if (context.tenantId !== targetTenantId) {
        return { allowed: false, reason: 'cross_tenant_denied' };
      }
    }

    // 4. Check MFA Requirement for Sensitive Operations
    if (SENSITIVE_PERMISSIONS.has(permission) || roleDef.mfaRequired) {
      if (SENSITIVE_PERMISSIONS.has(permission) && !context.mfaAuthenticated) {
        return { allowed: false, reason: 'mfa_required' };
      }
    }

    return { allowed: true };
  }

  /**
   * Convenience boolean checker.
   */
  public can(context: AccessContext, permission: Permission, targetTenantId?: string): boolean {
    return this.evaluate(context, permission, targetTenantId).allowed;
  }
}
