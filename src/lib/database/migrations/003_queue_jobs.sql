-- Migration 003: Distributed Queue Jobs & Transactional Outbox
-- Supports distributed worker coordination and atomic event publishing.

CREATE TABLE IF NOT EXISTS queue_jobs (
    id VARCHAR(64) PRIMARY KEY,
    partition_id INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'queued', -- queued, leased, completed, failed, dead_letter
    priority INTEGER NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    worker_id VARCHAR(128),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_priority ON queue_jobs (status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_lease_expires ON queue_jobs (status, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_partition ON queue_jobs (partition_id);

CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    topic VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, published, failed
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events (status, created_at);
