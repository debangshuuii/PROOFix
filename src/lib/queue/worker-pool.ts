/**
 * Worker Pool & Concurrency Coordinator (Contribution 164)
 *
 * Coordinates concurrent workers, automatic job lifecycle execution,
 * heartbeat lease renewals, retry backoffs, DLQ routing, and graceful draining.
 */

import crypto from 'crypto';
import type { QueueJob, WorkerInfo } from '../types/queue-database.ts';
import { DistributedQueueEngine } from './distributed-queue.ts';
import { DeadLetterQueueManager } from './dlq-manager.ts';

export type JobHandler<TData = Record<string, unknown>> = (job: QueueJob<TData>) => Promise<void>;

export interface WorkerPoolOptions {
  queueName: string;
  concurrency?: number;
  visibilityTimeoutMs?: number;
  pollIntervalMs?: number;
}

export class WorkerPool {
  private queueEngine: DistributedQueueEngine;
  private dlqManager: DeadLetterQueueManager;
  private queueName: string;
  private concurrency: number;
  private visibilityTimeoutMs: number;
  private pollIntervalMs: number;

  private workers: Map<string, WorkerInfo> = new Map();
  private handler?: JobHandler;
  private isRunning: boolean = false;
  private isDraining: boolean = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    queueEngine: DistributedQueueEngine,
    dlqManager: DeadLetterQueueManager,
    options: WorkerPoolOptions
  ) {
    this.queueEngine = queueEngine;
    this.dlqManager = dlqManager;
    this.queueName = options.queueName;
    this.concurrency = options.concurrency || 2;
    this.visibilityTimeoutMs = options.visibilityTimeoutMs || 30000;
    this.pollIntervalMs = options.pollIntervalMs || 50;

    // Initialize worker slots
    for (let i = 0; i < this.concurrency; i++) {
      const id = `wrk_${this.queueName}_${i + 1}_${crypto.randomBytes(3).toString('hex')}`;
      this.workers.set(id, {
        id,
        queueName: this.queueName,
        status: 'idle',
        jobsProcessed: 0,
        startedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      });
    }
  }

  /**
   * Registers the async handler and starts worker polling loop.
   */
  public start(handler: JobHandler): void {
    if (this.isRunning) return;
    this.handler = handler;
    this.isRunning = true;
    this.isDraining = false;

    this.pollTimer = setInterval(() => {
      this.tick();
    }, this.pollIntervalMs);
  }

  /**
   * Evaluates idle workers and assigns available jobs.
   */
  public async tick(): Promise<void> {
    if (!this.isRunning || this.isDraining || !this.handler) return;

    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        const job = await this.queueEngine.dequeue(this.queueName, worker.id, this.visibilityTimeoutMs);
        if (job) {
          this.processJob(worker, job);
        }
      }
    }
  }

  /**
   * Processes a single job within a worker context.
   */
  private async processJob(worker: WorkerInfo, job: QueueJob): Promise<void> {
    worker.status = 'busy';
    worker.currentJobId = job.id;
    worker.lastHeartbeat = new Date().toISOString();

    const leaseToken = job.leaseToken!;
    let heartbeatTimer: NodeJS.Timeout | undefined;

    // Start lease heartbeat extension every 1/3 of visibility timeout
    const heartbeatInterval = Math.max(500, Math.floor(this.visibilityTimeoutMs / 3));
    heartbeatTimer = setInterval(async () => {
      if (worker.status === 'busy') {
        await this.queueEngine.renewLease(job.id, leaseToken, this.visibilityTimeoutMs);
        worker.lastHeartbeat = new Date().toISOString();
      }
    }, heartbeatInterval);

    try {
      // Execute user handler
      await this.handler!(job);

      // Ack upon success
      await this.queueEngine.ack(job.id, leaseToken);
      worker.jobsProcessed += 1;
    } catch (err) {
      const errorMsg = (err as Error).message || 'Handler execution failed';

      if (job.attempts < job.maxRetries) {
        // Calculate backoff delay and reschedule as delayed job
        const delay = this.dlqManager.calculateRetryDelay(job.backoff, job.attempts);
        job.state = 'delayed';
        job.processAfter = new Date(Date.now() + delay).toISOString();
        job.errorReason = errorMsg;
        job.leaseToken = undefined;
        job.leaseExpiresAt = undefined;
      } else {
        // Retries exhausted -> Quarantine into DLQ
        await this.queueEngine.nack(job.id, leaseToken, errorMsg, false);
        this.dlqManager.quarantineJob(job, errorMsg, (err as Error).stack);
      }
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      worker.status = this.isDraining ? 'draining' : 'idle';
      worker.currentJobId = undefined;
      worker.lastHeartbeat = new Date().toISOString();
    }
  }

  /**
   * Gracefully drains the worker pool, allowing in-flight jobs to finish.
   */
  public async drain(timeoutMs: number = 5000): Promise<void> {
    this.isDraining = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const busyWorkers = Array.from(this.workers.values()).filter((w) => w.status === 'busy');
      if (busyWorkers.length === 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    for (const worker of this.workers.values()) {
      worker.status = 'stopped';
    }
    this.isRunning = false;
  }

  public getWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  public getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter((w) => w.status === 'busy').length;
  }
}
