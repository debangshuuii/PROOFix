import test from 'node:test';
import assert from 'node:assert/strict';
import { OutboxRepository } from '../src/lib/database/outbox-repository.ts';

function createMockAdapter() {
  const jobs = new Map();
  const outbox = new Map();

  return {
    dialect: 'memory',
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    query: async (sql, params = []) => {
      if (sql.includes('SELECT id, retry_count')) {
        const j = jobs.get(params[0]);
        return { rows: j ? [j] : [], rowCount: j ? 1 : 0, command: 'SELECT', durationMs: 1 };
      }
      if (sql.includes('UPDATE queue_jobs') && sql.includes('status = $1')) {
        const j = jobs.get(params[4]);
        if (j) {
          j.status = params[0];
          j.retryCount = params[1];
          j.errorMessage = params[2];
        }
        return { rows: [], rowCount: 1, command: 'UPDATE', durationMs: 1 };
      }
      if (sql.includes('UPDATE queue_jobs SET status = \'completed\'')) {
        const j = jobs.get(params[1]);
        if (j) j.status = 'completed';
        return { rows: [], rowCount: 1, command: 'UPDATE', durationMs: 1 };
      }
      return { rows: [], rowCount: 0, command: 'OK', durationMs: 1 };
    },
    beginTransaction: async () => {
      let pendingOps = [];
      return {
        query: async (sql, params = []) => {
          if (sql.includes('INSERT INTO queue_jobs')) {
            pendingOps.push(() =>
              jobs.set(params[0], {
                id: params[0],
                partitionId: params[1],
                status: 'queued',
                priority: params[2],
                payload: params[3],
                maxRetries: params[4],
                retryCount: 0,
              })
            );
          }
          if (sql.includes('INSERT INTO outbox_events')) {
            pendingOps.push(() =>
              outbox.set(params[0], {
                id: params[0],
                topic: params[1],
                status: 'pending',
              })
            );
          }
          if (sql.includes('SELECT id, partition_id')) {
            const queued = Array.from(jobs.values()).find((j) => j.status === 'queued');
            return { rows: queued ? [queued] : [], rowCount: queued ? 1 : 0, command: 'SELECT', durationMs: 1 };
          }
          if (sql.includes('UPDATE queue_jobs')) {
            const j = jobs.get(params[3]);
            if (j) {
              j.status = 'leased';
              j.workerId = params[0];
            }
          }
          return { rows: [], rowCount: 1, command: 'OK', durationMs: 1 };
        },
        commit: async () => {
          for (const op of pendingOps) op();
        },
        rollback: async () => {},
      };
    },
  };
}

test('enqueueJobWithOutbox creates atomic queue job and outbox event', async () => {
  const adapter = createMockAdapter();
  const repo = new OutboxRepository(adapter);

  const { job, outbox } = await repo.enqueueJobWithOutbox(
    {
      id: 'job-999',
      priority: 2,
      payload: { suite: 'Checkout E2E' },
    },
    'verification_events'
  );

  assert.equal(job.id, 'job-999');
  assert.equal(job.status, 'queued');
  assert.equal(job.priority, 2);
  assert.equal(outbox.topic, 'verification_events');
  assert.equal(outbox.status, 'pending');
});

test('leaseNextJob assigns pending job to worker', async () => {
  const adapter = createMockAdapter();
  const repo = new OutboxRepository(adapter);

  await repo.enqueueJobWithOutbox(
    { id: 'job-101', payload: { test: 1 } },
    'events'
  );

  const leased = await repo.leaseNextJob('worker-node-alpha', 60);
  assert.ok(leased);
  assert.equal(leased.id, 'job-101');
  assert.equal(leased.status, 'leased');
  assert.equal(leased.workerId, 'worker-node-alpha');
});

test('failJob increments retries and moves to dead_letter on limit', async () => {
  const adapter = createMockAdapter();
  const repo = new OutboxRepository(adapter);

  await repo.enqueueJobWithOutbox(
    { id: 'job-flaky', maxRetries: 2, payload: {} },
    'events'
  );

  const res1 = await repo.failJob('job-flaky', 'Network timeout');
  assert.equal(res1, 'retrying');

  const res2 = await repo.failJob('job-flaky', 'Network timeout 2');
  assert.equal(res2, 'dead_letter');
});
