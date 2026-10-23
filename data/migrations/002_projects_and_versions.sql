-- Migration 002: Projects and Project Versions
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES proofix_organizations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES proofix_users(id),
  name TEXT NOT NULL,
  description TEXT,
  repo_url TEXT NOT NULL,
  repo_provider TEXT NOT NULL DEFAULT 'github',
  default_branch TEXT NOT NULL DEFAULT 'main',
  local_path TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proofix_project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES proofix_projects(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  analysis_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON proofix_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON proofix_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_project ON proofix_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_tenant ON proofix_project_versions(tenant_id);
