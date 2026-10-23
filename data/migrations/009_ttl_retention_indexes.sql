-- Migration 009: Specialized TTL Retention Composite Indexes & Migration Meta Table
-- Up Migration

CREATE TABLE IF NOT EXISTS _proofix_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  batch_id INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_migrations_version ON _proofix_migrations(version);

-- Retention Scanning Accelerators
CREATE INDEX IF NOT EXISTS idx_runs_ttl_scan ON proofix_verification_runs(is_pinned, is_baseline, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_ttl_scan ON proofix_artifacts(created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_ttl_scan ON proofix_repair_proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON proofix_test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_findings_created ON proofix_findings(created_at);
