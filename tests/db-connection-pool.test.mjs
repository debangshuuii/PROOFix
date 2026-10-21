import assert from 'node:assert/strict';
import { DatabaseConnectionPool } from '../src/lib/db/connection-pool.ts';

console.log('--- Testing High-Performance Database Connection Pool (Contribution 167) ---');

const pool = new DatabaseConnectionPool({
  minConnections: 2,
  maxConnections: 5,
  idleTimeoutMs: 5000,
});

// 1. Initial State
const stats = pool.getStats();
assert.equal(stats.totalConnections, 2, 'Should pre-warm 2 minimum connections');
assert.equal(stats.activeConnections, 0);
assert.equal(stats.idleConnections, 2);
console.log('✅ Connection pool initialized with pre-warmed idle connections');

// 2. Acquire and Release
const conn = await pool.acquire();
assert.equal(conn.inUse, true);
assert.equal(pool.getStats().activeConnections, 1);
pool.release(conn);
assert.equal(conn.inUse, false);
assert.equal(pool.getStats().activeConnections, 0);
console.log('✅ Connection acquire and release verified');

// 3. Parameterized Query
const insertResult = await pool.query(
  'INSERT INTO test_runs (suite_name, status) VALUES ($1, $2)',
  ['login.spec.ts', 'passed']
);
assert.equal(insertResult.rowCount, 1);

const selectResult = await pool.query('SELECT * FROM test_runs');
assert.ok(selectResult.rowCount >= 1);
console.log('✅ Parameterized query execution verified');

// 4. Atomic Transaction Scope
const txResult = await pool.transaction(async (client) => {
  await client.query('INSERT INTO audit_logs (action) VALUES ($1)', ['run_started']);
  await client.query('INSERT INTO audit_logs (action) VALUES ($1)', ['run_finished']);
  return 'TRANSACTION_COMMITTED';
});

assert.equal(txResult, 'TRANSACTION_COMMITTED');
assert.equal(pool.getStats().activeConnections, 0, 'Connection must be returned to pool after transaction');
console.log('✅ Atomic transaction scope with auto-release verified');

// 5. Cleanup
pool.close();
assert.equal(pool.getStats().totalConnections, 0);
console.log('✅ Pool cleanup verified');

console.log('✅ Contribution 167 tests passed cleanly!');
