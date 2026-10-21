-- Migration 002: SOC2 Immutable Audit Ledger
-- Provides cryptographically hash-chained audit logging for enterprise governance compliance.

CREATE TABLE IF NOT EXISTS audit_ledger (
    sequence_id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    prev_hash VARCHAR(64) NOT NULL,
    curr_hash VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_ledger_tenant ON audit_ledger (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_event_type ON audit_ledger (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_created_at ON audit_ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_curr_hash ON audit_ledger (curr_hash);
