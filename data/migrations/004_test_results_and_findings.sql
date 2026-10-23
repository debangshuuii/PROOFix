-- Migration 004: Test Results and Findings
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_test_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES proofix_verification_runs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  stack_trace TEXT,
  route_path TEXT,
  http_status INTEGER,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proofix_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES proofix_verification_runs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  observed_fact TEXT NOT NULL,
  inferred_hypothesis TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'high',
  suggested_action TEXT NOT NULL,
  affected_file TEXT,
  affected_lines_json TEXT,
  patch_preview_diff TEXT,
  rule_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_results_run ON proofix_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_tenant ON proofix_test_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_findings_run ON proofix_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_findings_tenant_severity ON proofix_findings(tenant_id, severity);
