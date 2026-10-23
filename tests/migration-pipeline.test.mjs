/**
 * Unit & Integration Test: Migration Pipeline & Checksum Verification
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import {
  computeMigrationChecksum,
  loadAllMigrations,
  parseMigrationFileName,
} from '../src/lib/database/migration-checksum.ts';
import { MigrationPlanResolver } from '../src/lib/database/migration-plan-resolver.ts';

console.log('[TEST] Starting migration-pipeline.test.mjs...');

// 1. Verify deterministic checksum calculation
const sqlA = 'CREATE TABLE foo (id TEXT);\r\n';
const sqlB = 'CREATE TABLE foo (id TEXT);\n';
const hashA = computeMigrationChecksum(sqlA);
const hashB = computeMigrationChecksum(sqlB);
assert.equal(hashA, hashB, 'Line-ending differences should yield identical SHA-256');
assert.equal(typeof hashA, 'string');
assert.equal(hashA.length, 64);
console.log('✓ Checksum calculation is normalized and deterministic');

// 2. Verify filename parser
const parsed = parseMigrationFileName('001_core_tenants_and_users.sql');
assert.equal(parsed.version, 1);
assert.equal(parsed.name, 'core_tenants_and_users');

assert.throws(() => parseMigrationFileName('invalid_filename.sql'), /Invalid migration filename/);
console.log('✓ parseMigrationFileName handles valid and invalid filenames');

// 3. Load all migrations from data/migrations
const migrationsDir = path.join(process.cwd(), 'data', 'migrations');
const scripts = loadAllMigrations(migrationsDir);
assert.ok(scripts.length >= 9, `Expected at least 9 migrations, found ${scripts.length}`);
assert.equal(scripts[0].version, 1);
assert.equal(scripts[scripts.length - 1].version, 9);
for (const s of scripts) {
  assert.ok(s.checksumSha256.length === 64);
  assert.ok(s.upSql.length > 0);
}
console.log(`✓ Discovered and validated ${scripts.length} migrations`);

// 4. Test Plan Resolver: All pending
const emptyHistory = [];
const upPlanResult = MigrationPlanResolver.resolveUpPlan(scripts, emptyHistory);
assert.equal(upPlanResult.plan.direction, 'up');
assert.equal(upPlanResult.plan.currentVersion, 0);
assert.equal(upPlanResult.plan.scriptsToExecute.length, scripts.length);
assert.equal(upPlanResult.checksumMismatches.length, 0);
console.log('✓ Plan resolver resolves all pending scripts when DB is empty');

// 5. Test Checksum Drift Detection
const tamperedHistory = [
  {
    version: 1,
    name: 'core_tenants_and_users',
    checksum_sha256: 'tampered_bad_hash_0000000000000000000000000000000000000000000000',
    applied_at: new Date().toISOString(),
    execution_time_ms: 5,
    batch_id: 1,
  },
];
const driftResult = MigrationPlanResolver.resolveUpPlan(scripts, tamperedHistory);
assert.equal(driftResult.checksumMismatches.length, 1);
assert.equal(driftResult.checksumMismatches[0].version, 1);
console.log('✓ Plan resolver detects schema tampering and checksum drift');

console.log('All migration-pipeline tests passed successfully!');
