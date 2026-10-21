import assert from 'node:assert/strict';
import { DistributedQueueEngine } from '../src/lib/queue/distributed-queue.ts';
import { DeadLetterQueueManager } from '../src/lib/queue/dlq-manager.ts';
import { WorkerPool } from '../src/lib/queue/worker-pool.ts';

console.log('--- Testing Worker Pool & Concurrency Coordinator (Contribution 164) ---');

const queueEngine = new DistributedQueueEngine();
const dlqManager = new DeadLetterQueueManager();
const queueName = 'pool-test-queue';

const pool = new WorkerPool(queueEngine, dlqManager, {
  queueName,
  concurrency: 2,
  pollIntervalMs: 20,
  visibilityTimeoutMs: 5000,
});

const workers = pool.getWorkers();
assert.equal(workers.length, 2, 'Should spawn 2 concurrent workers');
assert.equal(workers[0].status, 'idle');
console.log('✅ Worker pool initialized with 2 idle worker slots');

// 1. Process successful jobs
const processedJobs = [];
pool.start(async (job) => {
  if (job.data.shouldFail) {
    throw new Error('Induced handler failure');
  }
  processedJobs.push(job.id);
});

const job1 = await queueEngine.enqueue({ queueName, data: { test: 'job-1' } });
const job2 = await queueEngine.enqueue({ queueName, data: { test: 'job-2' } });

// Allow worker pool to pick up and process
await new Promise((r) => setTimeout(r, 120));

assert.ok(processedJobs.includes(job1.id));
assert.ok(processedJobs.includes(job2.id));
assert.equal(queueEngine.getJob(job1.id).state, 'completed');
assert.equal(queueEngine.getJob(job2.id).state, 'completed');
console.log('✅ Concurrent jobs successfully processed and acknowledged by workers');

// 2. Process failing job leading to DLQ
const failingJob = await queueEngine.enqueue({
  queueName,
  data: { shouldFail: true },
  maxRetries: 1, // Only 1 attempt before DLQ
});

await new Promise((r) => setTimeout(r, 120));

const postRunJob = queueEngine.getJob(failingJob.id);
assert.equal(postRunJob.state, 'quarantined_dlq');
assert.equal(dlqManager.listEntries(queueName).length, 1);
console.log('✅ Failing job routed to DLQ after exhausting retries');

// 3. Graceful Draining
await pool.drain(1000);
const drainedWorkers = pool.getWorkers();
assert.ok(drainedWorkers.every((w) => w.status === 'stopped'));
console.log('✅ Worker pool gracefully drained and stopped');

console.log('✅ Contribution 164 tests passed cleanly!');
