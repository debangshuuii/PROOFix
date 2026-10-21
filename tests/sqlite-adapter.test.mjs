import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SqliteAdapter,
  globalSqliteAdapter,
} from '../src/lib/database/sqlite-adapter.ts';

test('SqliteAdapter initializes and applies WAL mode pragmas', async () => {
  const adapter = new SqliteAdapter({
    connectionUrl: 'file:./local-test.db',
    walMode: true,
  });

  await adapter.connect();
  assert.equal(adapter.isConnected(), true);

  const pragmas = adapter.getExecutedPragmas();
  assert.ok(pragmas.includes('PRAGMA journal_mode = WAL;'));
  assert.ok(pragmas.includes('PRAGMA foreign_keys = ON;'));
  assert.ok(pragmas.includes('PRAGMA synchronous = NORMAL;'));

  await adapter.disconnect();
  assert.equal(adapter.isConnected(), false);
});

test('normalizeSql transforms $1, $2 placeholders to ? markers', () => {
  const adapter = new SqliteAdapter();
  const raw = 'INSERT INTO audit (id, name, score) VALUES ($1, $2, $3)';
  const normalized = adapter.normalizeSql(raw);

  assert.equal(normalized, 'INSERT INTO audit (id, name, score) VALUES (?, ?, ?)');
});

test('SqliteAdapter handles transactions correctly', async () => {
  const adapter = new SqliteAdapter();
  const tx = await adapter.beginTransaction();

  const res = await tx.query('INSERT INTO t (val) VALUES (?)', ['hello']);
  assert.equal(res.command, 'INSERT');

  await tx.commit();
  await assert.rejects(async () => {
    await tx.query('SELECT 1');
  });
});
