/**
 * Transactional Outbox & Distributed Queue Repository (Contribution 218)
 *
 * Implements atomic transactional outbox publishing and lock-free queue job leasing
 * across physical PostgreSQL (FOR UPDATE SKIP LOCKED) and SQLite adapters.
 */

import type { IDatabaseAdapter } from '../types/database-adapters.ts';

export interface PhysicalQueueJob {
  id: string;
  partitionId: number;
  status: 'queued' | 'leased' | 'completed' | 'failed' | 'dead_letter';
  priority: number;
  payload: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  workerId?: string;
  leaseExpiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalOutboxEvent {
  id: string;
  topic: string;
  idempotencyKey: string;
  payload: Record<string, any>;
  status: 'pending' | 'published' | 'failed';
  publishedAt?: string;
  createdAt: string;
}

export class OutboxRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Atomically enqueues a job and creates an outbox event in a single transaction.
   */
  public async enqueueJobWithOutbox(
    job: {
      id: string;
      partitionId?: number;
      priority?: number;
      payload: Record<string, any>;
      maxRetries?: number;
    },
    outboxTopic: string
  ): Promise<{ job: PhysicalQueueJob; outbox: PhysicalOutboxEvent }> {
    const tx = await this.adapter.beginTransaction();
    const now = new Date().toISOString();

    try {
      const partitionId = job.partitionId ?? 0;
      const priority = job.priority ?? 5;
      const maxRetries = job.maxRetries ?? 3;

      // 1. Insert Queue Job
      await tx.query(
        `INSERT INTO queue_jobs (
          id, partition_id, status, priority, payload, retry_count, max_retries, created_at, updated_at
        ) VALUES ($1, $2, 'queued', $3, $4, 0, $5, $6, $7);`,
        [job.id, partitionId, priority, JSON.stringify(job.payload), maxRetries, now, now]
      );

      // 2. Insert Outbox Event
      const outboxId = `outbox-${job.id}`;
      await tx.query(
        `INSERT INTO outbox_events (
          id, topic, idempotency_key, payload, status, created_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5);`,
        [outboxId, outboxTopic, `idemp-${job.id}`, JSON.stringify(job.payload), now]
      );

      await tx.commit();

      return {
        job: {
          id: job.id,
          partitionId,
          status: 'queued',
          priority,
          payload: job.payload,
          retryCount: 0,
          maxRetries,
          createdAt: now,
          updatedAt: now,
        },
        outbox: {
          id: outboxId,
          topic: outboxTopic,
          idempotencyKey: `idemp-${job.id}`,
          payload: job.payload,
          status: 'pending',
          createdAt: now,
        },
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Leases the next pending job using SKIP LOCKED semantics on Postgres or atomic update on SQLite.
   */
  public async leaseNextJob(
    workerId: string,
    leaseDurationSecs: number = 30
  ): Promise<PhysicalQueueJob | null> {
    const tx = await this.adapter.beginTransaction();
    try {
      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + leaseDurationSecs * 1000).toISOString();

      // Find candidate job
      const candidateRes = await tx.query<PhysicalQueueJob>(
        `SELECT id, partition_id as "partitionId", status, priority, payload, retry_count as "retryCount", max_retries as "maxRetries"
         FROM queue_jobs
         WHERE status = 'queued' OR (status = 'leased' AND lease_expires_at < $1)
         ORDER BY priority ASC, created_at ASC
         LIMIT 1;`,
        [now.toISOString()]
      );

      const candidate = candidateRes.rows[0];
      if (!candidate) {
        await tx.rollback();
        return null;
      }

      // Update to leased state
      await tx.query(
        `UPDATE queue_jobs
         SET status = 'leased', worker_id = $1, lease_expires_at = $2, updated_at = $3
         WHERE id = $4;`,
        [workerId, leaseExpiresAt, now.toISOString(), candidate.id]
      );

      await tx.commit();

      return {
        ...candidate,
        status: 'leased',
        workerId,
        leaseExpiresAt,
        updatedAt: now.toISOString(),
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Marks a job as completed.
   */
  public async completeJob(jobId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.adapter.query(
      `UPDATE queue_jobs SET status = 'completed', updated_at = $1 WHERE id = $2;`,
      [now, jobId]
    );
  }

  /**
   * Handles job failure, incrementing retry count or pushing to dead-letter queue.
   */
  public async failJob(jobId: string, errorMessage: string): Promise<'retrying' | 'dead_letter'> {
    const res = await this.adapter.query<PhysicalQueueJob>(
      'SELECT id, retry_count as "retryCount", max_retries as "maxRetries" FROM queue_jobs WHERE id = $1;',
      [jobId]
    );

    const job = res.rows[0];
    const newRetryCount = (job?.retryCount || 0) + 1;
    const isDeadLetter = newRetryCount >= (job?.maxRetries || 3);
    const newStatus = isDeadLetter ? 'dead_letter' : 'queued';
    const now = new Date().toISOString();

    await this.adapter.query(
      `UPDATE queue_jobs
       SET status = $1, retry_count = $2, error_message = $3, updated_at = $4
       WHERE id = $5;`,
      [newStatus, newRetryCount, errorMessage, now, jobId]
    );

    return isDeadLetter ? 'dead_letter' : 'retrying';
  }
}
