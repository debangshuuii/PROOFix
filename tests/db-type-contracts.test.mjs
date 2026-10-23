/**
 * Unit Test: Database Type Contracts & Schema Validation
 */

import assert from 'node:assert/strict';
import { TABLE_NAMES } from '../src/lib/types/database-entities.ts';
import {
  createDefaultTenantContext,
  TenantViolationError,
  DEFAULT_SYSTEM_TENANT_ID,
} from '../src/lib/types/tenant-context.ts';
import { DEFAULT_RETENTION_POLICY } from '../src/lib/types/retention-policy.ts';

console.log('[TEST] Starting db-type-contracts.test.mjs...');

// 1. Verify TABLE_NAMES constants
assert.equal(TABLE_NAMES.PROJECTS, 'proofix_projects');
assert.equal(TABLE_NAMES.RUNS, 'proofix_verification_runs');
assert.equal(TABLE_NAMES.TEST_RESULTS, 'proofix_test_results');
assert.equal(TABLE_NAMES.FINDINGS, 'proofix_findings');
assert.equal(TABLE_NAMES.ARTIFACTS, 'proofix_artifacts');
assert.equal(TABLE_NAMES.MIGRATIONS, '_proofix_migrations');
console.log('✓ TABLE_NAMES verified');

// 2. Verify default tenant context generator
const defaultCtx = createDefaultTenantContext();
assert.equal(defaultCtx.tenantId, DEFAULT_SYSTEM_TENANT_ID);
assert.equal(defaultCtx.role, 'owner');
assert.equal(defaultCtx.isSystemAdmin, true);

const customCtx = createDefaultTenantContext({
  tenantId: 'tenant_custom_acme',
  role: 'member',
  userId: 'usr_john',
});
assert.equal(customCtx.tenantId, 'tenant_custom_acme');
assert.equal(customCtx.role, 'member');
assert.equal(customCtx.userId, 'usr_john');
console.log('✓ TenantContext generator verified');

// 3. Verify TenantViolationError structure
const violation = new TenantViolationError({
  requestedTenantId: 'tenant_target',
  contextTenantId: 'tenant_attacker',
  resourceType: 'Project',
  resourceId: 'proj_123',
});
assert.equal(violation.name, 'TenantViolationError');
assert.equal(violation.contextTenantId, 'tenant_attacker');
assert.equal(violation.requestedTenantId, 'tenant_target');
assert.ok(violation.message.includes('Cross-tenant access violation'));
console.log('✓ TenantViolationError verified');

// 4. Verify default TTL retention policy
assert.equal(DEFAULT_RETENTION_POLICY.enabled, true);
assert.equal(DEFAULT_RETENTION_POLICY.retentionDays, 30);
assert.equal(DEFAULT_RETENTION_POLICY.batchSize, 500);
assert.equal(DEFAULT_RETENTION_POLICY.protectPinnedRuns, true);
assert.equal(DEFAULT_RETENTION_POLICY.protectBaselineRuns, true);
assert.equal(DEFAULT_RETENTION_POLICY.deleteDiskArtifacts, true);
console.log('✓ DEFAULT_RETENTION_POLICY verified');

console.log('All db-type-contracts tests passed successfully!');
