-- Migration 005: Artifacts and User Journeys
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES proofix_verification_runs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  caption TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proofix_user_journeys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES proofix_users(id),
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  steps_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run ON proofix_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant ON proofix_artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journeys_tenant_owner ON proofix_user_journeys(tenant_id, owner_id);
