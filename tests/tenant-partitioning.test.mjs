import assert from 'node:assert/strict';
import { TenantPartitioningRouter } from '../src/lib/db/tenant-partitioning.ts';

console.log('--- Testing Multi-Tenant Data Partitioning & Sharding Router (Contribution 168) ---');

const router = new TenantPartitioningRouter();

// 1. Shards Registration
const shards = router.getShards();
assert.equal(shards.length, 3, 'Should have 3 default cluster shards');
console.log('✅ Cluster database shards registered');

// 2. Consistent Hashing Resolution
const tenantA = 'tenant_stripe_prod';
const tenantB = 'tenant_shopify_test';

const shardA1 = router.resolveShardForTenant(tenantA);
const shardA2 = router.resolveShardForTenant(tenantA);
assert.equal(shardA1.shardId, shardA2.shardId, 'Consistent hashing must be strictly deterministic');

const shardB = router.resolveShardForTenant(tenantB);
assert.ok(shardB.shardId);
console.log(`✅ Tenant [${tenantA}] mapped to shard: ${shardA1.shardId}`);

// 3. Schema Naming
const schema = router.getTenantSchemaName('Acme-Corp 2026!');
assert.equal(schema, 'tenant_acme_corp_2026_');
console.log('✅ Tenant schema naming sanitized correctly');

// 4. Cross-Tenant Query Isolation Validation
const safeQuery = 'SELECT * FROM test_runs WHERE tenant_id = $1';
assert.equal(router.validateQueryTenantIsolation(safeQuery, tenantA), true);

const unsafeQuery = 'SELECT * FROM test_runs'; // lacks tenant filter!
assert.equal(router.validateQueryTenantIsolation(unsafeQuery, tenantA), false);

await assert.rejects(
  async () => {
    await router.executeScopedQuery(tenantA, unsafeQuery);
  },
  /Cross-tenant isolation violation/,
  'Unscoped query must be blocked'
);
console.log('✅ Cross-tenant query leakage blocked by isolation guard');

// 5. Scoped Query Execution
const res = await router.executeScopedQuery(
  tenantA,
  'INSERT INTO test_runs (suite, tenant_id) VALUES ($1, $2)',
  ['checkout.spec.ts', tenantA]
);
assert.equal(res.shardId, shardA1.shardId);
console.log('✅ Scoped query executed on assigned tenant shard');

router.closeAll();
console.log('✅ Contribution 168 tests passed cleanly!');
