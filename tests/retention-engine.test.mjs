/**
 * Unit & Integration Test: TTL Retention Engine & Disk Cleanup
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NativeSqliteDriver } from '../src/lib/database/native-sqlite-driver.ts';
import { RetentionCandidateScanner } from '../src/lib/retention/retention-scanner.ts';
import { RetentionProtectionGuard } from '../src/lib/retention/retention-protection-guard.ts';
import { RetentionCascadePurger } from '../src/lib/retention/retention-cascade-purger.ts';
import { RetentionAuditLogger } from '../src/lib/retention/retention-audit-logger.ts';
import { DEFAULT_RETENTION_POLICY } from '../src/lib/types/retention-policy.ts';

console.log('[TEST] Starting retention-engine.test.mjs...');

const driver = NativeSqliteDriver.createInMemoryDriver();
await driver.connect();

// 1. Create tables needed for retention testing
await driver.execute(`
  CREATE TABLE proofix_verification_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_baseline INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE proofix_test_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE proofix_findings (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE proofix_artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE proofix_repair_proposals (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    strategy TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 2. Seed test runs (expired, fresh, pinned, baseline)
const now = Date.now();
const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago (expired)
const freshDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago (fresh)

// Temporary disk artifact file
const tempArtifactDir = path.join(process.cwd(), 'data', 'test_tmp');
if (!fs.existsSync(tempArtifactDir)) fs.mkdirSync(tempArtifactDir, { recursive: true });
const tempArtifactFile = path.join(tempArtifactDir, 'artifact_old.png');
fs.writeFileSync(tempArtifactFile, 'fake_screenshot_data');
assert.ok(fs.existsSync(tempArtifactFile));

// Insert runs
// Run 1: Expired and unpinned (MUST BE PURGED)
await driver.execute(
  'INSERT INTO proofix_verification_runs VALUES (?, ?, ?, ?, ?, ?);',
  ['run_exp_1', 'proj_1', 'tenant_1', 0, 0, oldDate]
);
await driver.execute('INSERT INTO proofix_test_results VALUES (?, ?, ?, ?, ?, ?);', [
  't1',
  'run_exp_1',
  'tenant_1',
  'Health Check',
  'passed',
  oldDate,
]);
await driver.execute('INSERT INTO proofix_findings VALUES (?, ?, ?, ?, ?);', [
  'f1',
  'run_exp_1',
  'tenant_1',
  'Dead link 404',
  oldDate,
]);
await driver.execute('INSERT INTO proofix_artifacts VALUES (?, ?, ?, ?, ?);', [
  'a1',
  'run_exp_1',
  'tenant_1',
  tempArtifactFile,
  oldDate,
]);

// Run 2: Expired BUT Pinned (PROTECTED)
await driver.execute(
  'INSERT INTO proofix_verification_runs VALUES (?, ?, ?, ?, ?, ?);',
  ['run_exp_pinned', 'proj_1', 'tenant_1', 1, 0, oldDate]
);

// Run 3: Expired BUT Baseline (PROTECTED)
await driver.execute(
  'INSERT INTO proofix_verification_runs VALUES (?, ?, ?, ?, ?, ?);',
  ['run_exp_baseline', 'proj_1', 'tenant_1', 0, 1, oldDate]
);

// Run 4: Fresh (PROTECTED)
await driver.execute(
  'INSERT INTO proofix_verification_runs VALUES (?, ?, ?, ?, ?, ?);',
  ['run_fresh', 'proj_1', 'tenant_1', 0, 0, freshDate]
);

// 3. Scan for candidates
const scanner = new RetentionCandidateScanner(driver);
const scanResult = await scanner.scanExpiredRuns(DEFAULT_RETENTION_POLICY, 'tenant_1');
assert.equal(scanResult.candidates.length, 3, 'Expected 3 candidates older than 30 days');
console.log('✓ Retention candidate scanner identified 3 expired runs');

// 4. Guard against protected runs (pinned & baseline)
const guardResult = RetentionProtectionGuard.filterProtectedRuns(
  scanResult.candidates,
  DEFAULT_RETENTION_POLICY
);
assert.equal(guardResult.purgeableRuns.length, 1);
assert.equal(guardResult.purgeableRuns[0].id, 'run_exp_1');
assert.equal(guardResult.protectedRuns.length, 2);
console.log('✓ RetentionProtectionGuard preserved pinned and baseline runs');

// 5. Cascade Purge
const purger = new RetentionCascadePurger(driver);
const summary = await purger.purgeRunsCascade(
  guardResult.purgeableRuns.map((r) => r.id),
  DEFAULT_RETENTION_POLICY
);

assert.equal(summary.runsCount, 1);
assert.equal(summary.testResultsCount, 1);
assert.equal(summary.findingsCount, 1);
assert.equal(summary.artifactsCount, 1);
assert.equal(summary.diskFilesDeleted, 1);
assert.equal(fs.existsSync(tempArtifactFile), false, 'Disk artifact file should be deleted');
console.log('✓ Cascade purge removed DB records and reclaimed disk artifact bytes');

// 6. Cryptographic Audit Logger
const auditLogger = new RetentionAuditLogger(driver);
const report = await auditLogger.logPurgeEvent({
  tenantId: 'tenant_1',
  triggeredAt: new Date().toISOString(),
  retentionCutoffDate: scanResult.cutoffDate,
  policy: DEFAULT_RETENTION_POLICY,
  summary,
  purgedRunIds: ['run_exp_1'],
  durationMs: 12,
});

assert.ok(report.id.startsWith('rep_retention_'));
assert.equal(report.sha256AuditSignature.length, 64);
console.log('✓ RetentionAuditLogger produced cryptographic SHA-256 audit report');

// Clean up
if (fs.existsSync(tempArtifactDir)) fs.rmdirSync(tempArtifactDir);
await driver.disconnect();

console.log('All retention-engine tests passed successfully!');
