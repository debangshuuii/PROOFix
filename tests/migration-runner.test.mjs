import test from 'node:test';
import assert from 'node:assert/strict';
import { MigrationRunner } from '../src/lib/database/migration-runner.ts';

function createMockAdapter() {
  const tables = new Map();
  tables.set('_schema_migrations', []);

  return {
    dialect: 'memory',
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    query: async (sql, params = []) => {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT VERSION')) {
        const rows = tables.get('_schema_migrations') || [];
        return { rows: [...rows], rowCount: rows.length, command: 'SELECT', durationMs: 1 };
      }
      return { rows: [], rowCount: 0, command: 'OK', durationMs: 1 };
    },
    beginTransaction: async () => {
      const pendingInserts = [];
      return {
        query: async (sql, params = []) => {
          if (sql.includes('INSERT INTO _schema_migrations')) {
            pendingInserts.push({
              version: params[0],
              id: params[1],
              checksum: params[2],
              executionTimeMs: params[3],
              appliedAt: new Date().toISOString(),
            });
          }
          return { rows: [], rowCount: 1, command: 'INSERT', durationMs: 1 };
        },
        commit: async () => {
          const list = tables.get('_schema_migrations') || [];
          list.push(...pendingInserts);
          tables.set('_schema_migrations', list);
        },
        rollback: async () => {},
      };
    },
  };
}

test('MigrationRunner registers scripts with valid SHA-256 checksums', () => {
  const runner = new MigrationRunner();
  runner.registerScript(1, '001_test', 'Initial test', 'CREATE TABLE test (id INT);');

  const scripts = runner.getRegisteredScripts();
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].version, 1);
  assert.equal(scripts[0].checksum.length, 64);
});

test('MigrationRunner executes pending migrations and advances version', async () => {
  const runner = new MigrationRunner();
  runner.registerScript(1, '001_test', 'Step 1', 'CREATE TABLE t1 (id INT);');
  runner.registerScript(2, '002_test', 'Step 2', 'CREATE TABLE t2 (id INT);');

  const mockAdapter = createMockAdapter();
  const res = await runner.migrateUp(mockAdapter);

  assert.equal(res.appliedCount, 2);
  assert.equal(res.pendingCount, 0);
  assert.equal(res.currentVersion, 2);
  assert.equal(res.migrations.length, 2);
});

test('MigrationRunner is idempotent on subsequent runs', async () => {
  const runner = new MigrationRunner();
  runner.registerScript(1, '001_test', 'Step 1', 'CREATE TABLE t1 (id INT);');

  const mockAdapter = createMockAdapter();
  const first = await runner.migrateUp(mockAdapter);
  assert.equal(first.appliedCount, 1);

  const second = await runner.migrateUp(mockAdapter);
  assert.equal(second.appliedCount, 0);
  assert.equal(second.currentVersion, 1);
});
