/**
 * Exponential Backoff, Jitter & Dead-Letter Queue (DLQ) Manager (Contribution 163)
 *
 * Implements exponential backoff with full jitter to avoid thundering herds,
 * and quarantine management for unrecoverable/exhausted jobs with redrive inspection.
 */

import crypto from 'crypto';
import type {
  QueueJob,
  BackoffStrategy,
  DeadLetterEntry,
} from '../types/queue-database.ts';

export class DeadLetterQueueManager {
  private dlqEntries: Map<string, DeadLetterEntry> = new Map();

  /**
   * Calculates backoff delay before the next retry attempt using selected strategy.
   */
  public calculateRetryDelay(strategy: BackoffStrategy, attempt: number, previousDelayMs?: number): number {
    const { type, baseDelayMs, maxDelayMs } = strategy;

    switch (type) {
      case 'fixed':
        return Math.min(baseDelayMs, maxDelayMs);

      case 'exponential': {
        const raw = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
        return Math.min(raw, maxDelayMs);
      }

      case 'exponential_jitter': {
        // Full jitter algorithm: random(0, min(maxDelayMs, baseDelay * 2^attempt))
        const ceiling = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
        return Math.floor(Math.random() * ceiling);
      }

      case 'decorrelated': {
        const prev = previousDelayMs || baseDelayMs;
        const sleep = Math.min(maxDelayMs, baseDelayMs + Math.random() * (prev * 3 - baseDelayMs));
        return Math.floor(sleep);
      }

      default:
        return baseDelayMs;
    }
  }

  /**
   * Quarantines a permanently failed or max-retried job into the Dead-Letter Queue.
   */
  public quarantineJob<TData = Record<string, unknown>>(
    job: QueueJob<TData>,
    failedReason: string,
    stackTrace?: string
  ): DeadLetterEntry<TData> {
    const dlqId = `dlq_${job.id}_${crypto.randomBytes(3).toString('hex')}`;

    // Mark job state
    job.state = 'quarantined_dlq';
    job.errorReason = failedReason;

    const entry: DeadLetterEntry<TData> = {
      id: dlqId,
      originalJob: job,
      failedReason,
      stackTrace,
      quarantinedAt: new Date().toISOString(),
      replayedCount: 0,
    };

    this.dlqEntries.set(dlqId, entry as unknown as DeadLetterEntry);
    return entry;
  }

  /**
   * Prepares a quarantined job for replay / redrive back into active queue.
   */
  public replayJob<TData = Record<string, unknown>>(
    dlqId: string
  ): QueueJob<TData> | null {
    const entry = this.dlqEntries.get(dlqId);
    if (!entry) return null;

    entry.replayedCount += 1;
    entry.lastReplayedAt = new Date().toISOString();

    const job = entry.originalJob;
    job.state = 'pending';
    job.attempts = 0; // Reset attempts for clean redrive
    job.errorReason = undefined;
    job.leaseToken = undefined;
    job.leaseExpiresAt = undefined;

    return job as unknown as QueueJob<TData>;
  }

  /**
   * Lists all quarantined entries, optionally filtered by original queue.
   */
  public listEntries(queueName?: string): DeadLetterEntry[] {
    const list = Array.from(this.dlqEntries.values());
    if (!queueName) return list;
    return list.filter((e) => e.originalJob.queueName === queueName);
  }

  public getEntry(dlqId: string): DeadLetterEntry | undefined {
    return this.dlqEntries.get(dlqId);
  }

  public removeEntry(dlqId: string): boolean {
    return this.dlqEntries.delete(dlqId);
  }

  public purge(queueName?: string): number {
    let purged = 0;
    for (const [id, entry] of this.dlqEntries.entries()) {
      if (!queueName || entry.originalJob.queueName === queueName) {
        this.dlqEntries.delete(id);
        purged++;
      }
    }
    return purged;
  }
}
