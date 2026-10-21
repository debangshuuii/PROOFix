import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Migration 001_initial_schema.sql defines _schema_migrations', () => {
  const p = path.join(process.cwd(), 'src/lib/database/migrations/001_initial_schema.sql');
  assert.ok(fs.existsSync(p));
  const sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS _schema_migrations'));
  assert.ok(sql.includes('checksum'));
  assert.ok(sql.includes('version INTEGER PRIMARY KEY'));
});

test('Migration 002_audit_ledger.sql defines immutable audit_ledger schema', () => {
  const p = path.join(process.cwd(), 'src/lib/database/migrations/002_audit_ledger.sql');
  assert.ok(fs.existsSync(p));
  const sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS audit_ledger'));
  assert.ok(sql.includes('prev_hash'));
  assert.ok(sql.includes('curr_hash'));
  assert.ok(sql.includes('tenant_id'));
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_audit_ledger_curr_hash'));
});

test('Migration 003_queue_jobs.sql defines queue_jobs and outbox_events', () => {
  const p = path.join(process.cwd(), 'src/lib/database/migrations/003_queue_jobs.sql');
  assert.ok(fs.existsSync(p));
  const sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS queue_jobs'));
  assert.ok(sql.includes('lease_expires_at'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS outbox_events'));
  assert.ok(sql.includes('idempotency_key'));
});
