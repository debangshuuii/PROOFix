import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DatabaseMigrationConsole UI component exists and provides migration features', () => {
  const filePath = path.join(process.cwd(), 'src/components/database/DatabaseMigrationConsole.tsx');
  assert.ok(fs.existsSync(filePath), 'Component file must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('Pluggable Physical Database Adapters & Schema Migrations'));
  assert.ok(content.includes('Migrate Up'));
  assert.ok(content.includes('_schema_migrations'));
  assert.ok(content.includes('Interactive Query Execution Sandbox'));
  assert.ok(content.includes('PostgreSQL 16 (Native Pool)'));
  assert.ok(content.includes('SQLite (WAL Mode)'));
});

test('Database page route exists and sets metadata', () => {
  const pagePath = path.join(process.cwd(), 'src/app/database/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Page route file must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(content.includes('DatabaseMigrationConsole'));
  assert.ok(content.includes('Database Adapters & Migrations'));
});
