-- Migration 001: Core Tenants, Organizations, and Users
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'enterprise',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proofix_organizations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS proofix_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES proofix_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON proofix_users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_orgs_tenant ON proofix_organizations(tenant_id);
