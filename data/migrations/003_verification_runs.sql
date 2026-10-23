-- Migration 003: Verification Runs with Retention Flags
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_verification_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES proofix_projects(id) ON DELETE CASCADE,
  project_version_id TEXT NOT NULL REFERENCES proofix_project_versions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  build_status TEXT NOT NULL DEFAULT 'pending',
  startup_status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  commit_hash TEXT NOT NULL,
  branch TEXT NOT NULL,
  execution_config_json TEXT NOT NULL DEFAULT '{}',
  isolation_disclaimer TEXT,
  summary_json TEXT NOT NULL DEFAULT '{"total":0,"passed":0,"failed":0,"blocked":0,"skipped":0,"inconclusive":0}',
  error_summary TEXT,
  logs_json TEXT NOT NULL DEFAULT '[]',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_baseline INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_project_created ON proofix_verification_runs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_tenant_created ON proofix_verification_runs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_retention ON proofix_verification_runs(tenant_id, is_pinned, is_baseline, created_at);
