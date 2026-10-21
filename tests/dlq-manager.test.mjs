import assert from 'node:assert/strict';
import { DeadLetterQueueManager } from '../src/lib/queue/dlq-manager.ts';

console.log('--- Testing Exponential Backoff, Jitter & Dead-Letter Queue (Contribution 163) ---');

const dlqMgr = new DeadLetterQueueManager();

// 1. Test Fixed Backoff
const fixedDelay = dlqMgr.calculateRetryDelay(
  { type: 'fixed', baseDelayMs: 2000, maxDelayMs: 10000, maxRetries: 3 },
  2
);
assert.equal(fixedDelay, 2000);

// 2. Test Exponential Backoff
const expStrategy = { type: 'exponential', baseDelayMs: 1000, maxDelayMs: 16000, maxRetries: 5 };
assert.equal(dlqMgr.calculateRetryDelay(expStrategy, 1), 1000); // 1000 * 2^0 = 1000
assert.equal(dlqMgr.calculateRetryDelay(expStrategy, 2), 2000); // 1000 * 2^1 = 2000
assert.equal(dlqMgr.calculateRetryDelay(expStrategy, 3), 4000); // 1000 * 2^2 = 4000
assert.equal(dlqMgr.calculateRetryDelay(expStrategy, 4), 8000); // 1000 * 2^3 = 8000
assert.equal(dlqMgr.calculateRetryDelay(expStrategy, 5), 16000); // capped at max
console.log('✅ Exponential backoff intervals computed accurately');

// 3. Test Full Jitter Backoff
const jitterStrategy = { type: 'exponential_jitter', baseDelayMs: 1000, maxDelayMs: 8000, maxRetries: 3 };
const jitterVal = dlqMgr.calculateRetryDelay(jitterStrategy, 3);
assert.ok(jitterVal >= 0 && jitterVal <= 4000, `Jitter value ${jitterVal} should be within [0, 4000]`);
console.log('✅ Full jitter backoff computed within randomized bounds');

// 4. Test DLQ Quarantining
const failedJob = {
  id: 'job-unrecoverable-001',
  queueName: 'playwright-runs',
  tenantId: 'tenant-1',
  data: { file: 'unhandled-crash.spec.ts' },
  priority: 'high',
  state: 'failed',
  attempts: 3,
  maxRetries: 3,
  backoff: expStrategy,
  createdAt: new Date().toISOString(),
};

const dlqEntry = dlqMgr.quarantineJob(failedJob, 'Fatal Chromium process segfault');
assert.ok(dlqEntry.id.startsWith('dlq_job-unrecoverable-001'));
assert.equal(failedJob.state, 'quarantined_dlq');
assert.equal(dlqEntry.failedReason, 'Fatal Chromium process segfault');
console.log('✅ Unrecoverable job successfully quarantined into DLQ');

// 5. Test Listing DLQ Entries
const list = dlqMgr.listEntries('playwright-runs');
assert.equal(list.length, 1);
assert.equal(list[0].id, dlqEntry.id);

// 6. Test Replay / Redrive
const replayed = dlqMgr.replayJob(dlqEntry.id);
assert.ok(replayed);
assert.equal(replayed.state, 'pending');
assert.equal(replayed.attempts, 0);
assert.equal(dlqEntry.replayedCount, 1);
console.log('✅ Quarantined job redrive re-queues job with reset attempts');

// 7. Test Purge
const purgedCount = dlqMgr.purge('playwright-runs');
assert.equal(purgedCount, 1);
assert.equal(dlqMgr.listEntries().length, 0);
console.log('✅ DLQ purge verified');

console.log('✅ Contribution 163 tests passed cleanly!');
