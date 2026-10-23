-- Migration 007: System Settings and Project Notifications
-- Up Migration

CREATE TABLE IF NOT EXISTS proofix_system_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS proofix_project_notifications (
  project_id TEXT PRIMARY KEY REFERENCES proofix_projects(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES proofix_tenants(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON proofix_project_notifications(tenant_id);
