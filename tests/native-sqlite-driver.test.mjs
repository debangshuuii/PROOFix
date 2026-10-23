/**
 * Unit & Integration Test: Native SQLite Driver with WAL Mode and Transactions
 */

import assert from 'node:assert/strict';
import { NativeSqliteDriver } from '../src/lib/database/native-sqlite-driver.ts';

console.log('[TEST] Starting native-sqlite-driver.test.mjs...');

// 1. In-Memory Driver Connection and Pragmas
const memDriver = NativeSqliteDriver.createInMemoryDriver();
await memDriver.connect();
assert.equal(memDriver.isConnected(), true);
assert.equal(memDriver.dialect, 'sqlite');

const health = await memDriver.getHealth();
assert.equal(health.healthy, true);
assert.equal(health.dialect, 'sqlite');
assert.ok(health.latencyMs >= 0);
console.log('✓ In-memory SQLite driver connects and reports healthy');

// 2. DDL Execution and Parameterized Queries
await memDriver.execute(`
  CREATE TABLE test_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER
  );
`);

const insertRes = await memDriver.execute(
  'INSERT INTO test_users (id, name, email, age) VALUES ($1, $2, $3, $4);',
  ['u1', 'Alice', 'alice@proofix.dev', 30]
);
assert.equal(insertRes.changes, 1);

const queryRes = await memDriver.query(
  'SELECT id, name, email, age FROM test_users WHERE id = $1;',
  ['u1']
);
assert.equal(queryRes.rowCount, 1);
assert.equal(queryRes.rows[0].name, 'Alice');
assert.equal(queryRes.rows[0].age, 30);
console.log('✓ Parameterized queries and Postgres $1 placeholder normalization verified');

// 3. Transactions: Commit
const tx1 = await memDriver.beginTransaction();
await tx1.execute('INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?);', [
  'u2',
  'Bob',
  'bob@proofix.dev',
  25,
]);
await tx1.commit();

const checkBob = await memDriver.query('SELECT * FROM test_users WHERE id = ?;', ['u2']);
assert.equal(checkBob.rowCount, 1);
console.log('✓ Transaction commit verified');

// 4. Transactions: Rollback
const tx2 = await memDriver.beginTransaction();
await tx2.execute('INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?);', [
  'u3',
  'Charlie',
  'charlie@proofix.dev',
  35,
]);
await tx2.rollback();

const checkCharlie = await memDriver.query('SELECT * FROM test_users WHERE id = ?;', ['u3']);
assert.equal(checkCharlie.rowCount, 0, 'Rolled back record should not exist');
console.log('✓ Transaction rollback verified');

// 5. Nested Savepoints
const tx3 = await memDriver.beginTransaction();
await tx3.execute('INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?);', [
  'u4',
  'David',
  'david@proofix.dev',
  40,
]);
const sp = await tx3.createSavepoint();
await tx3.execute('INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?);', [
  'u5',
  'Eve',
  'eve@proofix.dev',
  22,
]);
await tx3.rollbackToSavepoint(sp);
await tx3.commit();

const checkDavid = await memDriver.query('SELECT * FROM test_users WHERE id = ?;', ['u4']);
assert.equal(checkDavid.rowCount, 1);
const checkEve = await memDriver.query('SELECT * FROM test_users WHERE id = ?;', ['u5']);
assert.equal(checkEve.rowCount, 0);
console.log('✓ Nested savepoint rollback verified');

await memDriver.disconnect();
assert.equal(memDriver.isConnected(), false);
console.log('✓ Disconnect verified');

console.log('All native-sqlite-driver tests passed successfully!');
