-- Migration 006: Self-Repair Proposals and Patch Transactions
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_repair_proposals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES proofix_verification_runs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL REFERENCES proofix_findings(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  composite_score REAL NOT NULL DEFAULT 0.0,
  confidence_score REAL NOT NULL DEFAULT 0.0,
  unified_diff TEXT NOT NULL,
  target_files_json TEXT NOT NULL DEFAULT '[]',
  prover_outcome_json TEXT,
  published_pr_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proofix_patch_transactions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proofix_repair_proposals(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  backup_manifest_json TEXT NOT NULL DEFAULT '[]',
  reverse_diff TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_run ON proofix_repair_proposals(run_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proofix_repair_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patch_tx_proposal ON proofix_patch_transactions(proposal_id);
