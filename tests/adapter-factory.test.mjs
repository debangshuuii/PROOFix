import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DatabaseAdapterFactory,
  globalDatabaseAdapterFactory,
} from '../src/lib/database/adapter-factory.ts';

test('createAdapter instantiates PostgresAdapter for postgresql URLs', () => {
  const factory = new DatabaseAdapterFactory();
  const adapter = factory.createAdapter('postgresql://usr:pwd@db.internal:5432/proofix');

  assert.equal(adapter.dialect, 'postgres');
});

test('createAdapter instantiates SqliteAdapter for file and sqlite URLs', () => {
  const factory = new DatabaseAdapterFactory();
  const adapter1 = factory.createAdapter('file:./data/proofix.db');
  assert.equal(adapter1.dialect, 'sqlite');

  const adapter2 = factory.createAdapter('libsql://my-turso-db.turso.io');
  assert.equal(adapter2.dialect, 'sqlite');
});

test('redactUri scrubs sensitive database credentials', () => {
  const factory = new DatabaseAdapterFactory();
  const scrubbed = factory.redactUri('postgresql://super_admin:P@ssword123!@db.host.com:5432/core');

  assert.ok(!scrubbed.includes('super_admin'));
  assert.ok(!scrubbed.includes('P@ssword123!'));
  assert.ok(scrubbed.includes('postgresql://***:***@db.host.com:5432/core'));
});

test('checkHealth verifies connection and returns latency metrics', async () => {
  const factory = new DatabaseAdapterFactory();
  const adapter = factory.createAdapter('file:./proofix.db');

  const health = await factory.checkHealth(adapter);
  assert.equal(health.healthy, true);
  assert.equal(health.dialect, 'sqlite');
  assert.ok(health.latencyMs >= 0);
});
