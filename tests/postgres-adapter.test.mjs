import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PostgresAdapter,
  globalPostgresAdapter,
} from '../src/lib/database/postgres-adapter.ts';

test('PostgresAdapter initializes with default or custom config', () => {
  const adapter = new PostgresAdapter({
    connectionUrl: 'postgresql://app:secret@db.internal:5432/proofix_prod',
    maxConnections: 25,
    ssl: true,
  });

  const cfg = adapter.getConfig();
  assert.equal(cfg.dialect, 'postgres');
  assert.equal(cfg.connectionUrl, 'postgresql://app:secret@db.internal:5432/proofix_prod');
  assert.equal(cfg.maxConnections, 25);
  assert.equal(cfg.ssl, true);
});

test('PostgresAdapter connects and executes health check query', async () => {
  const adapter = new PostgresAdapter();
  await adapter.connect();
  assert.equal(adapter.isConnected(), true);

  const res = await adapter.query('SELECT 1 AS HEALTH_CHECK');
  assert.equal(res.command, 'SELECT');
  assert.ok(res.durationMs >= 0);

  await adapter.disconnect();
  assert.equal(adapter.isConnected(), false);
});

test('PostgresAdapter handles transactions with commit and rollback', async () => {
  const adapter = new PostgresAdapter();
  const tx = await adapter.beginTransaction();

  const res = await tx.query('INSERT INTO audit_ledger (event_id) VALUES ($1)', ['evt-123']);
  assert.equal(res.command, 'INSERT');

  await tx.commit();

  // Subsequent query on committed tx throws
  await assert.rejects(async () => {
    await tx.query('SELECT 1');
  });
});
