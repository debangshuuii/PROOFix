-- Migration 001: Initial Schema & Version Metadata
-- Tracks applied migrations and checksums for automated schema evolution.

CREATE TABLE IF NOT EXISTS _schema_migrations (
    version INTEGER PRIMARY KEY,
    id VARCHAR(128) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON _schema_migrations (applied_at);
