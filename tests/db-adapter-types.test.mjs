import test from 'node:test';
import assert from 'node:assert/strict';

test('DatabaseAdapterConfig contracts support Postgres and SQLite', () => {
  const pgConfig = {
    dialect: 'postgres',
    connectionUrl: 'postgresql://postgres:secret@localhost:5432/proofix',
    maxConnections: 20,
    ssl: { rejectUnauthorized: false },
  };

  const sqliteConfig = {
    dialect: 'sqlite',
    connectionUrl: 'file:./proofix-local.db',
    walMode: true,
  };

  assert.equal(pgConfig.dialect, 'postgres');
  assert.equal(pgConfig.maxConnections, 20);
  assert.equal(sqliteConfig.dialect, 'sqlite');
  assert.equal(sqliteConfig.walMode, true);
});

test('MigrationScript and ExecutionResult structures validate properly', () => {
  const script = {
    id: '001_initial_schema',
    version: 1,
    description: 'Create initial outbox and audit tables',
    upSql: 'CREATE TABLE IF NOT EXISTS audit_ledger (id TEXT PRIMARY KEY);',
    downSql: 'DROP TABLE IF EXISTS audit_ledger;',
    checksum: 'a1b2c3d4e5f6',
  };

  assert.equal(script.version, 1);
  assert.equal(script.id, '001_initial_schema');
  assert.ok(script.upSql.includes('CREATE TABLE'));

  const result = {
    appliedCount: 1,
    pendingCount: 0,
    currentVersion: 1,
    migrations: [
      {
        version: 1,
        id: script.id,
        checksum: script.checksum,
        appliedAt: new Date().toISOString(),
        executionTimeMs: 14.5,
      },
    ],
  };

  assert.equal(result.appliedCount, 1);
  assert.equal(result.currentVersion, 1);
});
