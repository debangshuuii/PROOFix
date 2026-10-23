/**
 * Unit & Mock Integration Test: Native PostgreSQL Driver
 */

import assert from 'node:assert/strict';
import { NativePostgresDriver } from '../src/lib/database/native-postgres-driver.ts';

console.log('[TEST] Starting native-postgres-driver.test.mjs...');

// 1. Initialize driver with custom configuration
const pgDriver = new NativePostgresDriver({
  connectionUrl: 'postgresql://postgres:postgres@localhost:5432/proofix_test',
  maxPoolSize: 5,
  minPoolSize: 1,
});

await pgDriver.connect();
assert.equal(pgDriver.isConnected(), true);
assert.equal(pgDriver.dialect, 'postgres');

const health = await pgDriver.getHealth();
assert.equal(health.healthy, true);
assert.equal(health.dialect, 'postgres');
assert.ok(health.latencyMs >= 0);
console.log('✓ PostgreSQL driver connects and reports healthy');

// 2. Query execution with positional parameters ($1, $2)
const qResult = await pgDriver.query(
  'SELECT id, name FROM proofix_users WHERE tenant_id = $1;',
  ['tenant_1']
);
assert.equal(qResult.command, 'SELECT');
assert.ok(Array.isArray(qResult.rows));
console.log('✓ Parameterized query execution verified');

// 3. Statement execution
const sResult = await pgDriver.execute(
  'INSERT INTO proofix_users (id, tenant_id, organization_id, email, name, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);',
  [
    'u_pg_1',
    'tenant_1',
    'org_1',
    'user@test.dev',
    'Test User',
    'member',
    1,
    new Date().toISOString(),
    new Date().toISOString(),
  ]
);
assert.ok(sResult.durationMs >= 0);
console.log('✓ Statement execution verified');

// 4. Transaction Session Commit
const tx1 = await pgDriver.beginTransaction('READ_COMMITTED');
assert.equal(tx1.isCompleted(), false);
await tx1.execute('UPDATE proofix_users SET name = $1 WHERE id = $2;', ['Updated Name', 'u_pg_1']);
await tx1.commit();
assert.equal(tx1.isCompleted(), true);
console.log('✓ Transaction commit verified');

// 5. Transaction Session Rollback
const tx2 = await pgDriver.beginTransaction('SERIALIZABLE');
await tx2.execute('DELETE FROM proofix_users WHERE id = $1;', ['u_pg_1']);
await tx2.rollback();
assert.equal(tx2.isCompleted(), true);
console.log('✓ Transaction rollback verified');

// 6. Disconnect
await pgDriver.disconnect();
assert.equal(pgDriver.isConnected(), false);
console.log('✓ Disconnect and pool closure verified');

console.log('All native-postgres-driver tests passed successfully!');
