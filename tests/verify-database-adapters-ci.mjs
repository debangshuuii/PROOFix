/**
 * PROOFix Master Physical Database Adapters CI Suite (Contribution 220)
 *
 * Validates:
 * 1. Physical database adapter contracts and configuration schemas
 * 2. Raw SQL schema DDL files for audit ledger, queue jobs, and transactional outbox
 * 3. Automated migration runner with SHA-256 checksum drift detection
 * 4. Native PostgreSQL physical adapter with connection pooling and transactions
 * 5. SQLite & Turso physical adapter with WAL mode optimization
 * 6. Pluggable database adapter factory and connection health ping
 * 7. Cryptographically hash-chained persistent audit ledger repository
 * 8. Atomic transactional outbox and queue job leasing repository
 * 9. Database sharding and schema migration console UI
 */

import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('🚀 Running PROOFix Pluggable Physical Database Adapters CI Suite...\n');

const testSuites = [
  'tests/db-adapter-types.test.mjs',
  'tests/db-migration-ddl.test.mjs',
  'tests/migration-runner.test.mjs',
  'tests/postgres-adapter.test.mjs',
  'tests/sqlite-adapter.test.mjs',
  'tests/adapter-factory.test.mjs',
  'tests/audit-ledger-repository.test.mjs',
  'tests/outbox-repository.test.mjs',
  'tests/db-migration-ui.test.mjs',
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  process.stdout.write(`  ⏳ Running ${suite}... `);
  try {
    execSync(`node ${suite}`, { stdio: 'pipe' });
    console.log('✅ PASS');
    totalPassed++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    totalFailed++;
  }
}

console.log('\n---------------------------------------------------------');
console.log(`📊 Database Adapters Verification Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('---------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Pluggable Physical Database Adapter verification gates PASSED successfully!\n');
}
