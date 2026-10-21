import assert from 'node:assert/strict';
import { RbacPolicyEngine } from '../src/lib/governance/rbac-engine.ts';

console.log('--- Testing Granular Role-Based Access Control (RBAC) (Contribution 172) ---');

const engine = new RbacPolicyEngine(['192.168.1.100', '10.0.0.50']);

// 1. Developer Permissions Check
const devContext = {
  userId: 'usr-dev-1',
  userRole: 'developer',
  tenantId: 'tenant-alpha',
  clientIp: '192.168.1.100',
  mfaAuthenticated: false,
};

assert.equal(engine.can(devContext, 'runs:trigger', 'tenant-alpha'), true);
assert.equal(engine.can(devContext, 'healing:approve', 'tenant-alpha'), false, 'Developers cannot approve healing PRs');
console.log('✅ Developer role permissions strictly bounded');

// 2. Tenant Boundary Isolation
assert.equal(
  engine.can(devContext, 'runs:read', 'tenant-beta'),
  false,
  'Access across tenant boundaries must be rejected'
);
const evalCrossTenant = engine.evaluate(devContext, 'runs:read', 'tenant-beta');
assert.equal(evalCrossTenant.reason, 'cross_tenant_denied');
console.log('✅ Cross-tenant resource access strictly rejected');

// 3. Super Admin Cross-Tenant Access
const adminContext = {
  userId: 'usr-admin-1',
  userRole: 'super_admin',
  tenantId: 'tenant-system',
  clientIp: '192.168.1.100',
  mfaAuthenticated: true,
};

assert.equal(engine.can(adminContext, 'runs:read', 'tenant-beta'), true);
assert.equal(engine.can(adminContext, 'healing:approve', 'tenant-beta'), true);
console.log('✅ Super admin cross-tenant access permitted');

// 4. MFA Requirement for Sensitive Operations
const qaLeadNoMfa = {
  userId: 'usr-qa-1',
  userRole: 'qa_lead',
  tenantId: 'tenant-alpha',
  clientIp: '192.168.1.100',
  mfaAuthenticated: false, // MFA missing!
};

const mfaEval = engine.evaluate(qaLeadNoMfa, 'healing:approve', 'tenant-alpha');
assert.equal(mfaEval.allowed, false);
assert.equal(mfaEval.reason, 'mfa_required');

// With MFA
const qaLeadWithMfa = { ...qaLeadNoMfa, mfaAuthenticated: true };
assert.equal(engine.can(qaLeadWithMfa, 'healing:approve', 'tenant-alpha'), true);
console.log('✅ Multi-Factor Authentication (MFA) step-up enforcement verified');

// 5. IP Allowlist Enforcement
const externalIpContext = {
  ...devContext,
  clientIp: '203.0.113.42', // untrusted external IP
};

const ipEval = engine.evaluate(externalIpContext, 'runs:read', 'tenant-alpha');
assert.equal(ipEval.allowed, false);
assert.equal(ipEval.reason, 'ip_not_allowed');
console.log('✅ Untrusted IP address access denied by perimeter allowlist');

console.log('✅ Contribution 172 tests passed cleanly!');
