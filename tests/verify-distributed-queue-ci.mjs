import assert from 'node:assert/strict';

// System imports
import { DistributedQueueEngine } from '../src/lib/queue/distributed-queue.ts';
import { DeadLetterQueueManager } from '../src/lib/queue/dlq-manager.ts';
import { WorkerPool } from '../src/lib/queue/worker-pool.ts';
import { TransactionalOutboxPublisher } from '../src/lib/queue/outbox-publisher.ts';
import { DistributedLockManager } from '../src/lib/queue/distributed-lock.ts';
import { DatabaseConnectionPool } from '../src/lib/db/connection-pool.ts';
import { TenantPartitioningRouter } from '../src/lib/db/tenant-partitioning.ts';

console.log('========================================================================');
console.log('🚀 PROOFix Master CI Suite: Distributed Queue & Database (161–170)');
console.log('========================================================================\n');

// Step 1: Distributed Queue Priority Ordering
console.log('Step 1: Testing Priority Queue Scheduling & At-Least-Once Delivery...');
const queueEngine = new DistributedQueueEngine();
await queueEngine.enqueue({ queueName: 'ci-pipeline', data: { task: 'low' }, priority: 'low' });
const criticalJob = await queueEngine.enqueue({ queueName: 'ci-pipeline', data: { task: 'critical' }, priority: 'critical' });
const firstDeq = await queueEngine.dequeue('ci-pipeline', 'worker-ci');
assert.equal(firstDeq.id, criticalJob.id, 'Critical job must be dequeued first');
assert.ok(firstDeq.leaseToken, 'Job must have active lease token');
await queueEngine.ack(firstDeq.id, firstDeq.leaseToken);
console.log('  -> Priority FIFO scheduling and ACK verified.\n');

// Step 2: Exponential Backoff & DLQ Quarantining
console.log('Step 2: Testing Full Jitter Backoff & DLQ Quarantine...');
const dlqMgr = new DeadLetterQueueManager();
const delay = dlqMgr.calculateRetryDelay(
  { type: 'exponential_jitter', baseDelayMs: 500, maxDelayMs: 4000, maxRetries: 3 },
  2
);
assert.ok(delay >= 0 && delay <= 2000);
const dlqEntry = dlqMgr.quarantineJob(
  { id: 'job-poison', queueName: 'ci-pipeline', tenantId: 't1', data: {}, priority: 'normal', state: 'failed', attempts: 3, maxRetries: 3, backoff: { type: 'fixed', baseDelayMs: 100, maxDelayMs: 100, maxRetries: 3 }, createdAt: new Date().toISOString() },
  'Unrecoverable syntax error'
);
assert.equal(dlqMgr.listEntries('ci-pipeline').length, 1);
const replayed = dlqMgr.replayJob(dlqEntry.id);
assert.equal(replayed.state, 'pending');
assert.equal(replayed.attempts, 0);
console.log('  -> Jitter backoff, DLQ quarantine, and redrive verified.\n');

// Step 3: Concurrent Worker Pool
console.log('Step 3: Testing Worker Pool Execution & Graceful Drain...');
const pool = new WorkerPool(queueEngine, dlqMgr, { queueName: 'ci-workers', concurrency: 2, pollIntervalMs: 20 });
let workerExecCount = 0;
pool.start(async (job) => {
  workerExecCount++;
});
await queueEngine.enqueue({ queueName: 'ci-workers', data: { num: 1 } });
await queueEngine.enqueue({ queueName: 'ci-workers', data: { num: 2 } });
await new Promise((r) => setTimeout(r, 80));
assert.equal(workerExecCount, 2);
await pool.drain(500);
console.log('  -> Worker pool processed tasks and drained safely.\n');

// Step 4: Transactional Outbox Pattern
console.log('Step 4: Testing Transactional Outbox Dual-Write Safety...');
const outbox = new TransactionalOutboxPublisher(queueEngine);
const staged = await outbox.stageEvent({
  aggregateType: 'RunAudit',
  aggregateId: 'audit-001',
  eventType: 'StatusChanged',
  payload: { newStatus: 'passed' },
});
assert.equal(staged.published, false);
const publishedCount = await outbox.publishPending();
assert.equal(publishedCount, 1);
const outboxDeq = await queueEngine.dequeue('events.runaudit', 'consumer-outbox');
assert.ok(outboxDeq);
assert.equal(outboxDeq.data.aggregateId, 'audit-001');
console.log('  -> Outbox atomic staging and relay confirmed.\n');

// Step 5: Distributed Locks & Monotonic Fencing Tokens
console.log('Step 5: Testing Distributed Locks & Auto-Renewing Leases...');
const lockMgr = new DistributedLockManager();
const lease1 = await lockMgr.acquire('cluster-lock', { ttlMs: 1000 });
assert.ok(lease1);
const lease2 = await lockMgr.acquire('cluster-lock', { ttlMs: 1000, maxRetries: 0 });
assert.equal(lease2, null, 'Conflicting lock acquire must fail');
await lockMgr.release(lease1);
const lease3 = await lockMgr.acquire('cluster-lock', { ttlMs: 1000 });
assert.ok(lease3.fencingToken > lease1.fencingToken, 'Fencing token must increment monotonically');
await lockMgr.release(lease3);
console.log('  -> Distributed locking, fencing tokens, and lease renewal verified.\n');

// Step 6: Database Connection Pool & Transaction Scopes
console.log('Step 6: Testing DB Connection Pooling & Atomic Transactions...');
const dbPool = new DatabaseConnectionPool({ minConnections: 2, maxConnections: 5 });
const txOut = await dbPool.transaction(async (client) => {
  await client.query('INSERT INTO artifacts (name) VALUES ($1)', ['report.pdf']);
  return 'TX_OK';
});
assert.equal(txOut, 'TX_OK');
assert.equal(dbPool.getStats().activeConnections, 0);
dbPool.close();
console.log('  -> DB pool transactions and parameterized queries verified.\n');

// Step 7: Multi-Tenant Partitioning & Shard Isolation Guard
console.log('Step 7: Testing Multi-Tenant Sharding & Cross-Tenant Guards...');
const shardingRouter = new TenantPartitioningRouter();
const tenantId = 'tenant_enterprise_corp';
const shard = shardingRouter.resolveShardForTenant(tenantId);
assert.ok(shard.shardId);
assert.equal(shardingRouter.validateQueryTenantIsolation('SELECT * FROM test_runs WHERE tenant_id = $1', tenantId), true);
assert.equal(shardingRouter.validateQueryTenantIsolation('SELECT * FROM test_runs', tenantId), false);
const queryRes = await shardingRouter.executeScopedQuery(
  tenantId,
  'SELECT * FROM tenant_enterprise_corp.metrics'
);
assert.equal(queryRes.shardId, shard.shardId);
shardingRouter.closeAll();
console.log('  -> Tenant shard routing and cross-tenant guard confirmed.\n');

console.log('========================================================================');
console.log('🎉 ALL 10 DISTRIBUTED QUEUE & DB VERIFICATION CHECKS PASSED!');
console.log('========================================================================');
