/**
 * Production Database & Distributed Queue Architecture Types (Contribution 161)
 */

export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export type JobState =
  | 'pending'
  | 'delayed'
  | 'active'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'quarantined_dlq';

export interface BackoffStrategy {
  type: 'fixed' | 'exponential' | 'exponential_jitter' | 'decorrelated';
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
}

export interface QueueJob<TData = Record<string, unknown>> {
  id: string;
  queueName: string;
  tenantId: string;
  data: TData;
  priority: JobPriority;
  state: JobState;
  attempts: number;
  maxRetries: number;
  backoff: BackoffStrategy;
  createdAt: string;
  processAfter?: string; // For delayed / scheduled jobs
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  errorReason?: string;
  leaseToken?: string;
  leaseExpiresAt?: number;
}

export interface DeadLetterEntry<TData = Record<string, unknown>> {
  id: string;
  originalJob: QueueJob<TData>;
  failedReason: string;
  stackTrace?: string;
  quarantinedAt: string;
  replayedCount: number;
  lastReplayedAt?: string;
}

export interface QueueMetrics {
  queueName: string;
  pendingCount: number;
  activeCount: number;
  delayedCount: number;
  completedCount: number;
  failedCount: number;
  dlqCount: number;
  throughputPerSec: number;
  averageLatencyMs: number;
}

export interface WorkerInfo {
  id: string;
  queueName: string;
  status: 'idle' | 'busy' | 'draining' | 'stopped';
  currentJobId?: string;
  jobsProcessed: number;
  startedAt: string;
  lastHeartbeat: string;
}

export interface DistributedLockOptions {
  ttlMs: number;
  retryIntervalMs?: number;
  maxRetries?: number;
}

export interface DistributedLockLease {
  lockKey: string;
  ownerToken: string;
  expiresAt: number;
  fencingToken: number;
  released: boolean;
}

export interface OutboxEvent<TPayload = Record<string, unknown>> {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: TPayload;
  published: boolean;
  createdAt: string;
  publishedAt?: string;
  retryCount: number;
}

export interface DbPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  maxLifetimeMs: number;
}

export interface ShardMetadata {
  shardId: string;
  tenantPrefix: string;
  host: string;
  isPrimary: boolean;
  activeConnections: number;
}
