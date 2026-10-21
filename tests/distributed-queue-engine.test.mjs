import assert from 'node:assert/strict';
import { DistributedQueueEngine } from '../src/lib/queue/distributed-queue.ts';

console.log('--- Testing Reliable Distributed Message Queue Engine (Contribution 162) ---');

const queueEngine = new DistributedQueueEngine();
const queueName = 'playwright-e2e-jobs';

// 1. Test Priority Scheduling
const jobLow = await queueEngine.enqueue({
  queueName,
  data: { task: 'low-priority-job' },
  priority: 'low',
});

const jobCritical = await queueEngine.enqueue({
  queueName,
  data: { task: 'critical-security-alert' },
  priority: 'critical',
});

const jobNormal = await queueEngine.enqueue({
  queueName,
  data: { task: 'normal-run' },
  priority: 'normal',
});

// Dequeue should return critical first, then normal, then low
const deq1 = await queueEngine.dequeue(queueName, 'worker-1');
assert.ok(deq1);
assert.equal(deq1.id, jobCritical.id, 'Critical priority job must be dequeued first');

const deq2 = await queueEngine.dequeue(queueName, 'worker-1');
assert.ok(deq2);
assert.equal(deq2.id, jobNormal.id, 'Normal priority job must be dequeued second');

const deq3 = await queueEngine.dequeue(queueName, 'worker-1');
assert.ok(deq3);
assert.equal(deq3.id, jobLow.id, 'Low priority job must be dequeued third');
console.log('✅ Priority-aware FIFO dequeue verified');

// 2. Test Ack and Metrics
assert.ok(deq1.leaseToken);
const ackSuccess = await queueEngine.ack(deq1.id, deq1.leaseToken);
assert.equal(ackSuccess, true);
assert.equal(queueEngine.getJob(deq1.id).state, 'completed');

// 3. Test Lease Renewal
assert.ok(deq2.leaseToken);
const renewSuccess = await queueEngine.renewLease(deq2.id, deq2.leaseToken, 60000);
assert.equal(renewSuccess, true);
console.log('✅ Job acknowledgment and lease renewal verified');

// 4. Test Visibility Timeout Re-leasing
const timeoutJob = await queueEngine.enqueue({
  queueName,
  data: { task: 'timeout-test' },
  priority: 'normal',
});

// Dequeue with very short visibility timeout (10ms)
const deqTimeout = await queueEngine.dequeue(queueName, 'worker-slow', 10);
assert.ok(deqTimeout);
assert.equal(deqTimeout.state, 'active');

// Wait 25ms for lease to expire
await new Promise((r) => setTimeout(r, 25));

// Another worker tries to dequeue -> should re-acquire the expired job
const deqReacquired = await queueEngine.dequeue(queueName, 'worker-fast');
assert.ok(deqReacquired);
assert.equal(deqReacquired.id, timeoutJob.id, 'Expired job should be re-leased to available worker');
console.log('✅ Visibility timeout expiration and safe re-leasing verified');

// 5. Test Delayed Job Scheduling
const delayedJob = await queueEngine.enqueue({
  queueName,
  data: { task: 'delayed-report' },
  delayMs: 30,
});
assert.equal(delayedJob.state, 'delayed');

// Immediate dequeue should not return delayed job
const immediateDeq = await queueEngine.dequeue(queueName, 'worker-1');
assert.equal(immediateDeq, null, 'Delayed job should not be available immediately');

// Wait 40ms for delay to mature
await new Promise((r) => setTimeout(r, 40));
const matureDeq = await queueEngine.dequeue(queueName, 'worker-1');
assert.ok(matureDeq);
assert.equal(matureDeq.id, delayedJob.id, 'Matured delayed job should now be dequeued');
console.log('✅ Delayed job scheduling verified');

// 6. Test Nack with Retry
const nackSuccess = await queueEngine.nack(matureDeq.id, matureDeq.leaseToken, 'transient_network_error', true);
assert.equal(nackSuccess, true);
const retriedJob = queueEngine.getJob(matureDeq.id);
assert.equal(retriedJob.state, 'pending');
assert.equal(retriedJob.errorReason, 'transient_network_error');
console.log('✅ Nack with automatic retry verified');

console.log('✅ Contribution 162 tests passed cleanly!');
