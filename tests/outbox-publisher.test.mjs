import assert from 'node:assert/strict';
import { DistributedQueueEngine } from '../src/lib/queue/distributed-queue.ts';
import { TransactionalOutboxPublisher } from '../src/lib/queue/outbox-publisher.ts';

console.log('--- Testing Transactional Outbox Pattern & Event Publisher (Contribution 165) ---');

const queueEngine = new DistributedQueueEngine();
const outbox = new TransactionalOutboxPublisher(queueEngine);

// 1. Stage Events
const event1 = await outbox.stageEvent({
  aggregateType: 'TestRun',
  aggregateId: 'run-888',
  eventType: 'RunCompleted',
  payload: { passed: 42, failed: 0 },
});

const event2 = await outbox.stageEvent({
  aggregateType: 'SelfHealing',
  aggregateId: 'heal-999',
  eventType: 'PrCreated',
  payload: { prUrl: 'https://github.com/org/repo/pull/12' },
});

assert.equal(event1.published, false);
assert.equal(event2.published, false);
assert.equal(outbox.getPendingCount(), 2);
console.log('✅ Outbox events staged atomically with published: false');

// 2. Publish Pending
const published = await outbox.publishPending();
assert.equal(published, 2);
assert.equal(outbox.getPendingCount(), 0);

const updated1 = outbox.getEvent(event1.id);
assert.equal(updated1.published, true);
assert.ok(updated1.publishedAt);

// 3. Verify Events Arrived in Target Queue
const deqTestRun = await queueEngine.dequeue('events.testrun', 'wrk-consumer');
assert.ok(deqTestRun);
assert.equal(deqTestRun.data.eventId, event1.id);
assert.equal(deqTestRun.data.eventType, 'RunCompleted');
console.log('✅ Pending events relayed to queue with at-least-once delivery');

// 4. Test Background Polling
outbox.startPolling(20);
const asyncEvent = await outbox.stageEvent({
  aggregateType: 'TestRun',
  aggregateId: 'run-async',
  eventType: 'RunQueued',
  payload: { suite: 'auth.spec.ts' },
});

await new Promise((r) => setTimeout(r, 60));
assert.equal(outbox.getEvent(asyncEvent.id).published, true);
outbox.stopPolling();
console.log('✅ Outbox background polling daemon verified');

console.log('✅ Contribution 165 tests passed cleanly!');
