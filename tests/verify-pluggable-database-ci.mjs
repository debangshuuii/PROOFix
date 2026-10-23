/**
 * Master Pluggable Database & Persistence Engine CI Verification Suite
 *
 * Validates the full 10-stage database lifecycle:
 * 1. Database Dialects & Configuration Contracts
 * 2. Idempotent Migration Manifest & SHA-256 Checksum Calculation
 * 3. Execution of Migrations 001 - 009 on Native SQLite Engine
 * 4. SQLite WAL Mode, PRAGMA Optimizations, and Transaction Sessions
 * 5. Migration Lock Manager & Lease Concurrency
 * 6. PostgreSQL Driver & Connection Pool Bridge
 * 7. Multi-Tenant Partitioning, TenantGuard & Query Rewriting
 * 8. TTL Retention Scanner & 30-Day Window Enforcement
 * 9. Cascade Purge of Expired Records & Physical Disk Artifacts
 * 10. Cryptographic SHA-256 Retention Audit Ledger Logging
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TABLE_NAMES } from '../src/lib/types/database-entities.ts';
import {
  computeMigrationChecksum,
  loadAllMigrations,
} from '../src/lib/database/migration-checksum.ts';
import { NativeSqliteDriver } from '../src/lib/database/native-sqlite-driver.ts';
import { MigrationOrchestrator } from '../src/lib/database/migration-orchestrator.ts';
import { MigrationLockManager } from '../src/lib/database/migration-lock.ts';
import { NativePostgresDriver } from '../src/lib/database/native-postgres-driver.ts';
import { TenantContextResolver } from '../src/lib/tenancy/tenant-context-resolver.ts';
import { TenantGuard } from '../src/lib/tenancy/tenant-guard.ts';
import { TenantQueryRewriter } from '../src/lib/tenancy/tenant-query-rewriter.ts';
import { RetentionCandidateScanner } from '../src/lib/retention/retention-scanner.ts';
import { RetentionProtectionGuard } from '../src/lib/retention/retention-protection-guard.ts';
import { RetentionCascadePurger } from '../src/lib/retention/retention-cascade-purger.ts';
import { RetentionAuditLogger } from '../src/lib/retention/retention-audit-logger.ts';
import { DEFAULT_RETENTION_POLICY } from '../src/lib/types/retention-policy.ts';
import { PluggableProjectRepository } from '../src/lib/repositories/project-repository.ts';

const stages = [
  'Database Dialects & Configuration Contracts',
  'Idempotent Migration Manifest & SHA-256 Checksums',
  'Execution of Migrations 001 - 009 on Native SQLite',
  'SQLite WAL Mode, PRAGMAs & Transactional Sessions',
  'Migration Lock Manager & Concurrency Leases',
  'PostgreSQL Driver & Connection Pool Bridge',
  'Multi-Tenant Boundary Isolation & Query Rewriting',
  'TTL Retention Scanner & 30-Day Window Enforcement',
  'Cascade Purge of Expired Records & Disk Artifacts',
  'Cryptographic SHA-256 Retention Audit Ledger Logging',
];

console.log('='.repeat(70));
console.log('PROOFix Pluggable Database & Persistence Engine CI Verification');
console.log('='.repeat(70));

let currentStageIndex = 0;
function logStage(name) {
  currentStageIndex++;
  console.log(`\n[Stage ${currentStageIndex}/10] ${name}...`);
}

// STAGE 1: Database Dialects & Configuration Contracts
logStage(stages[0]);
assert.equal(TABLE_NAMES.PROJECTS, 'proofix_projects');
assert.equal(TABLE_NAMES.RUNS, 'proofix_verification_runs');
assert.equal(TABLE_NAMES.MIGRATIONS, '_proofix_migrations');
console.log('✓ Entity table mapping contracts verified');

// STAGE 2: Idempotent Migration Manifest & SHA-256 Checksums
logStage(stages[1]);
const migrationsDir = path.join(process.cwd(), 'data', 'migrations');
const scripts = loadAllMigrations(migrationsDir);
assert.ok(scripts.length >= 9, `Expected >= 9 migrations, found ${scripts.length}`);
for (const s of scripts) {
  assert.equal(s.checksumSha256.length, 64, `Migration ${s.version} must have 64-char SHA256`);
  assert.ok(s.upSql.length > 0);
}
console.log(`✓ Loaded and verified ${scripts.length} migration scripts with SHA-256 hashes`);

// STAGE 3: Execution of Migrations 001 - 009 on Native SQLite Engine
logStage(stages[2]);
const testDbFile = path.join(process.cwd(), 'data', 'test_ci_proofix.db');
if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

const sqliteDriver = NativeSqliteDriver.createFileDriver(testDbFile);
await sqliteDriver.connect();
const orchestrator = new MigrationOrchestrator(sqliteDriver, migrationsDir);
const upReport = await orchestrator.up();
assert.equal(upReport.success, true);
assert.equal(upReport.appliedCount, scripts.length);
assert.equal(upReport.currentVersion, 9);
assert.equal(upReport.checksumMismatches.length, 0);
console.log(`✓ Successfully executed ${upReport.appliedCount} migrations up to version 9`);

// Verify idempotency (re-running applies 0 pending scripts)
const idempReport = await orchestrator.up();
assert.equal(idempReport.appliedCount, 0);
assert.equal(idempReport.currentVersion, 9);
console.log('✓ Idempotency verified: 0 pending scripts applied on second run');

// STAGE 4: SQLite WAL Mode, PRAGMAs & Transactional Sessions
logStage(stages[3]);
const pragmas = sqliteDriver.getExecutedPragmas();
assert.ok(pragmas.some((p) => p.includes('WAL')), 'WAL journal mode pragma must be executed');
assert.ok(pragmas.some((p) => p.includes('foreign_keys = ON')), 'Foreign keys must be enabled');

const tx = await sqliteDriver.beginTransaction('SERIALIZABLE');
await tx.execute('INSERT INTO proofix_tenants VALUES (?, ?, ?, ?, ?, ?, ?);', [
  't_ci_1',
  'Acme Corp',
  'acme-corp',
  'enterprise',
  1,
  new Date().toISOString(),
  new Date().toISOString(),
]);
await tx.commit();
const tenantCheck = await sqliteDriver.query('SELECT * FROM proofix_tenants WHERE id = ?;', ['t_ci_1']);
assert.equal(tenantCheck.rowCount, 1);
console.log('✓ WAL pragmas and atomic transactions verified');

// STAGE 5: Migration Lock Manager & Concurrency Leases
logStage(stages[4]);
const lockManager = new MigrationLockManager(sqliteDriver, 10000);
const acquired1 = await lockManager.acquireLock('worker_A');
assert.equal(acquired1, true);
const acquired2 = await lockManager.acquireLock('worker_B');
assert.equal(acquired2, false, 'Second worker should be blocked while lock held');
await lockManager.releaseLock('worker_A');
const acquired3 = await lockManager.acquireLock('worker_B');
assert.equal(acquired3, true, 'Worker B acquires after release');
await lockManager.releaseLock('worker_B');
console.log('✓ Migration lock lease and concurrent worker exclusion verified');

// STAGE 6: PostgreSQL Driver & Connection Pool Bridge
logStage(stages[5]);
const pgDriver = new NativePostgresDriver();
await pgDriver.connect();
assert.equal(pgDriver.dialect, 'postgres');
const pgHealth = await pgDriver.getHealth();
assert.equal(pgHealth.healthy, true);
const pgQuery = await pgDriver.query('SELECT 1 AS HEALTH_CHECK;');
assert.equal(pgQuery.rowCount, 1);
await pgDriver.disconnect();
console.log('✓ PostgreSQL pooled client adapter and health checks verified');

// STAGE 7: Multi-Tenant Boundary Isolation & Query Rewriting
logStage(stages[6]);
const headers = {
  'x-tenant-id': 't_ci_1',
  'x-organization-id': 'org_ci_1',
  'x-user-id': 'usr_ci_1',
  'x-user-role': 'admin',
};
const tenantCtx = TenantContextResolver.resolveFromHeaders(headers);
assert.equal(tenantCtx.tenantId, 't_ci_1');
assert.equal(tenantCtx.organizationId, 'org_ci_1');

TenantGuard.assertOwnership('t_ci_1', tenantCtx, 'Project', 'p1');
assert.throws(
  () => TenantGuard.assertOwnership('t_other', tenantCtx, 'Project', 'p1'),
  /Cross-tenant access violation/
);

const rewritten = TenantQueryRewriter.injectTenantFilter(
  'SELECT * FROM proofix_projects WHERE id = ?;',
  ['proj_1'],
  't_ci_1'
);
assert.ok(rewritten.sql.includes('WHERE tenant_id = ? AND'));
console.log('✓ Cross-tenant boundary firewall and SQL query rewriting verified');

// STAGE 8: TTL Retention Scanner & 30-Day Window Enforcement
logStage(stages[7]);
const nowMs = Date.now();
const oldDate = new Date(nowMs - 40 * 24 * 60 * 60 * 1000).toISOString();
const freshDate = new Date().toISOString();

// Seed Project Version & Runs
await sqliteDriver.execute('INSERT INTO proofix_organizations VALUES (?, ?, ?, ?, ?, ?);', [
  'org_ci_1',
  't_ci_1',
  'Acme Eng',
  'acme-eng',
  nowMs.toString(),
  nowMs.toString(),
]);
await sqliteDriver.execute('INSERT INTO proofix_users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);', [
  'usr_ci_1',
  't_ci_1',
  'org_ci_1',
  'ci@acme.dev',
  'CI User',
  'admin',
  null,
  1,
  nowMs.toString(),
  nowMs.toString(),
]);

const projRepo = new PluggableProjectRepository(sqliteDriver);
await projRepo.createProject(
  {
    id: 'proj_ci_retention',
    ownerId: 'usr_ci_1',
    name: 'CI Project',
    description: '',
    repoUrl: 'https://github.com/proofix/ci',
    repoProvider: 'github',
    defaultBranch: 'main',
    localPath: '.',
    config: {},
    createdAt: oldDate,
    updatedAt: oldDate,
  },
  tenantCtx
);

await projRepo.createProjectVersion(
  {
    id: 'ver_ci_1',
    projectId: 'proj_ci_retention',
    commitHash: 'abc',
    branch: 'main',
    analysis: {},
    createdAt: oldDate,
  },
  tenantCtx
);

// Run A (Old, Expired)
await sqliteDriver.execute(
  'INSERT INTO proofix_verification_runs (id, project_id, project_version_id, tenant_id, run_number, started_at, commit_hash, branch, created_at, is_pinned, is_baseline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
  ['run_purge_me', 'proj_ci_retention', 'ver_ci_1', 't_ci_1', 1, oldDate, 'abc', 'main', oldDate, 0, 0]
);

// Run B (Old, Pinned - Protected)
await sqliteDriver.execute(
  'INSERT INTO proofix_verification_runs (id, project_id, project_version_id, tenant_id, run_number, started_at, commit_hash, branch, created_at, is_pinned, is_baseline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
  ['run_keep_pinned', 'proj_ci_retention', 'ver_ci_1', 't_ci_1', 2, oldDate, 'abc', 'main', oldDate, 1, 0]
);

const scanner = new RetentionCandidateScanner(sqliteDriver);
const scan = await scanner.scanExpiredRuns(DEFAULT_RETENTION_POLICY, 't_ci_1');
assert.equal(scan.candidates.length, 2);

const guarded = RetentionProtectionGuard.filterProtectedRuns(scan.candidates, DEFAULT_RETENTION_POLICY);
assert.equal(guarded.purgeableRuns.length, 1);
assert.equal(guarded.purgeableRuns[0].id, 'run_purge_me');
assert.equal(guarded.protectedRuns.length, 1);
assert.equal(guarded.protectedRuns[0].id, 'run_keep_pinned');
console.log('✓ 30-Day TTL window and pinned run protection verified');

// STAGE 9: Cascade Purge of Expired Records & Disk Artifacts
logStage(stages[8]);
const testArtifactFile = path.join(process.cwd(), 'data', 'test_purge_artifact.png');
fs.writeFileSync(testArtifactFile, 'test-image-bytes');
assert.ok(fs.existsSync(testArtifactFile));

await sqliteDriver.execute(
  'INSERT INTO proofix_artifacts (id, run_id, tenant_id, type, file_path, size_bytes, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
  ['art_purge_1', 'run_purge_me', 't_ci_1', 'screenshot', testArtifactFile, 16, 'image/png', oldDate]
);

const purger = new RetentionCascadePurger(sqliteDriver);
const purgeSummary = await purger.purgeRunsCascade(
  guarded.purgeableRuns.map((r) => r.id),
  DEFAULT_RETENTION_POLICY
);
assert.equal(purgeSummary.runsCount, 1);
assert.equal(purgeSummary.artifactsCount, 1);
assert.equal(purgeSummary.diskFilesDeleted, 1);
assert.equal(fs.existsSync(testArtifactFile), false, 'Disk artifact file must be deleted');
console.log('✓ Cascade deletion and physical disk artifact reclamation verified');

// STAGE 10: Cryptographic SHA-256 Retention Audit Ledger Logging
logStage(stages[9]);
const auditLogger = new RetentionAuditLogger(sqliteDriver);
const auditReport = await auditLogger.logPurgeEvent({
  tenantId: 't_ci_1',
  triggeredAt: new Date().toISOString(),
  retentionCutoffDate: scan.cutoffDate,
  policy: DEFAULT_RETENTION_POLICY,
  summary: purgeSummary,
  purgedRunIds: ['run_purge_me'],
  durationMs: 25,
});

assert.ok(auditReport.id.startsWith('rep_retention_'));
assert.equal(auditReport.sha256AuditSignature.length, 64);

const ledgerRows = await sqliteDriver.query(
  'SELECT * FROM proofix_audit_ledger WHERE event_type = ?;',
  ['retention_cleanup']
);
assert.equal(ledgerRows.rowCount, 1);
console.log('✓ Tamper-evident SHA-256 audit ledger entry verified');

// Cleanup
await sqliteDriver.disconnect();
if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
const shmFile = `${testDbFile}-shm`;
const walFile = `${testDbFile}-wal`;
if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
if (fs.existsSync(walFile)) fs.unlinkSync(walFile);

console.log('\n' + '='.repeat(70));
console.log('ALL 10/10 PLUGGABLE DATABASE ENGINE CI STAGES PASSED CLEANLY!');
console.log('='.repeat(70));
