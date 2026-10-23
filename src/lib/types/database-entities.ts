/**
 * Database Relational Entity Row Schemas and Table Definitions
 *
 * Provides type contracts for all relational tables, column mappings,
 * and JSON-serialized attributes across SQLite and PostgreSQL engines.
 */

export const TABLE_NAMES = {
  TENANTS: 'proofix_tenants',
  ORGANIZATIONS: 'proofix_organizations',
  USERS: 'proofix_users',
  PROJECTS: 'proofix_projects',
  PROJECT_VERSIONS: 'proofix_project_versions',
  RUNS: 'proofix_verification_runs',
  TEST_RESULTS: 'proofix_test_results',
  FINDINGS: 'proofix_findings',
  ARTIFACTS: 'proofix_artifacts',
  REPAIR_PROPOSALS: 'proofix_repair_proposals',
  PATCH_TRANSACTIONS: 'proofix_patch_transactions',
  JOURNEYS: 'proofix_user_journeys',
  SETTINGS: 'proofix_system_settings',
  NOTIFICATIONS: 'proofix_project_notifications',
  AUDIT_LOGS: 'proofix_audit_ledger',
  OUTBOX_JOBS: 'proofix_outbox_jobs',
  MIGRATIONS: '_proofix_migrations',
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  password_hash?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  owner_id: string;
  name: string;
  description: string;
  repo_url: string;
  repo_provider: string;
  default_branch: string;
  local_path: string;
  config_json: string; // Serialized ProjectConfig
  created_at: string;
  updated_at: string;
}

export interface ProjectVersionRow {
  id: string;
  project_id: string;
  tenant_id: string;
  commit_hash: string;
  branch: string;
  analysis_json: string; // Serialized ProjectAnalysis
  created_at: string;
}

export interface VerificationRunRow {
  id: string;
  project_id: string;
  project_version_id: string;
  tenant_id: string;
  run_number: number;
  status: string;
  build_status: string;
  startup_status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  commit_hash: string;
  branch: string;
  execution_config_json: string;
  isolation_disclaimer?: string;
  summary_json: string; // Serialized RunSummary
  error_summary?: string;
  logs_json: string; // Serialized string[]
  is_pinned?: number; // 0 or 1
  is_baseline?: number; // 0 or 1
  created_at: string;
}

export interface TestResultRow {
  id: string;
  run_id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  duration_ms: number;
  error_message?: string;
  stack_trace?: string;
  route_path?: string;
  http_status?: number;
  evidence_json: string; // Serialized TestEvidence
  created_at: string;
}

export interface FindingRow {
  id: string;
  run_id: string;
  tenant_id: string;
  category: string;
  severity: string;
  title: string;
  observed_fact: string;
  inferred_hypothesis: string;
  confidence: string;
  suggested_action: string;
  affected_file?: string;
  affected_lines_json?: string;
  patch_preview_diff?: string;
  rule_id?: string;
  created_at: string;
}

export interface ArtifactRow {
  id: string;
  run_id: string;
  tenant_id: string;
  type: string;
  file_path: string;
  size_bytes: number;
  mime_type: string;
  caption?: string;
  metadata_json?: string;
  created_at: string;
}

export interface RepairProposalRow {
  id: string;
  run_id: string;
  tenant_id: string;
  finding_id: string;
  strategy: string;
  status: string;
  composite_score: number;
  confidence_score: number;
  unified_diff: string;
  target_files_json: string;
  prover_outcome_json?: string;
  published_pr_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserJourneyRow {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  description?: string;
  target_url: string;
  steps_json: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingsRow {
  id: string;
  tenant_id: string;
  settings_json: string;
  updated_at: string;
}

export interface ProjectNotificationSettingsRow {
  project_id: string;
  tenant_id: string;
  settings_json: string;
  updated_at: string;
}
