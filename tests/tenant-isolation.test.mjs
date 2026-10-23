/**
 * Unit Test: Multi-Tenant Boundary Enforcement & Query Rewriting
 */

import assert from 'node:assert/strict';
import { TenantContextResolver } from '../src/lib/tenancy/tenant-context-resolver.ts';
import { TenantGuard } from '../src/lib/tenancy/tenant-guard.ts';
import { TenantQueryRewriter } from '../src/lib/tenancy/tenant-query-rewriter.ts';
import { TenantPartitionOrchestrator } from '../src/lib/tenancy/tenant-partition-orchestrator.ts';
import { TenantViolationError } from '../src/lib/types/tenant-context.ts';

console.log('[TEST] Starting tenant-isolation.test.mjs...');

// 1. Tenant Context Resolver from Headers
const validHeaders = {
  'x-tenant-id': 'tenant_acme_corp',
  'x-organization-id': 'org_acme_engineering',
  'x-user-id': 'usr_sarah',
  'x-user-role': 'admin',
};

const resolved = TenantContextResolver.resolveFromHeaders(validHeaders);
assert.equal(resolved.tenantId, 'tenant_acme_corp');
assert.equal(resolved.organizationId, 'org_acme_engineering');
assert.equal(resolved.userId, 'usr_sarah');
assert.equal(resolved.role, 'admin');
console.log('✓ Headers successfully resolved into TenantContext');

// 2. Reject Malicious Identifiers (SQLi / path traversal)
assert.throws(
  () => TenantContextResolver.resolveFromHeaders({ 'x-tenant-id': "tenant' OR 1=1--" }),
  /Invalid tenant ID format/
);
assert.throws(
  () => TenantContextResolver.resolveFromHeaders({ 'x-tenant-id': '../etc/passwd' }),
  /Invalid tenant ID format/
);
console.log('✓ Malicious tenant identifiers safely rejected');

// 3. Cross-Tenant Mutation Firewall (TenantGuard)
const acmeCtx = resolved;
const otherTenantId = 'tenant_globex_inc';

// Same tenant: should not throw
TenantGuard.assertOwnership('tenant_acme_corp', acmeCtx, 'VerificationRun', 'run_123');

// Cross-tenant: must throw TenantViolationError
assert.throws(
  () => TenantGuard.assertOwnership(otherTenantId, acmeCtx, 'VerificationRun', 'run_456'),
  (err) => {
    assert.ok(err instanceof TenantViolationError);
    assert.equal(err.contextTenantId, 'tenant_acme_corp');
    assert.equal(err.requestedTenantId, otherTenantId);
    return true;
  }
);
console.log('✓ Cross-tenant access attempts blocked by TenantGuard');

// 4. Query Rewriter Injection
const selectNoWhere = TenantQueryRewriter.injectTenantFilter(
  'SELECT * FROM proofix_projects',
  [],
  'tenant_acme_corp'
);
assert.equal(selectNoWhere.sql, 'SELECT * FROM proofix_projects WHERE tenant_id = ?');
assert.deepEqual(selectNoWhere.params, ['tenant_acme_corp']);

const selectWithWhere = TenantQueryRewriter.injectTenantFilter(
  'SELECT * FROM proofix_projects WHERE id = ?',
  ['proj_1'],
  'tenant_acme_corp'
);
assert.ok(selectWithWhere.sql.includes('WHERE tenant_id = ? AND'));
assert.deepEqual(selectWithWhere.params, ['tenant_acme_corp', 'proj_1']);
console.log('✓ Automated WHERE tenant_id injection verified');

// 5. Partition Orchestrator Shard Resolution
const orchestrator = new TenantPartitionOrchestrator();
const shardId1 = orchestrator.resolveShardId('tenant_acme_corp');
const shardId2 = orchestrator.resolveShardId('tenant_acme_corp');
assert.equal(shardId1, shardId2, 'Consistent hashing must be deterministic');
assert.ok(shardId1.startsWith('shard-'));
console.log(`✓ Partition orchestrator resolved tenant to shard [${shardId1}]`);

console.log('All tenant-isolation tests passed successfully!');
