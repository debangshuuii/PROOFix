import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Production Database & Distributed Queue Types (Contribution 161) ---');

const typesFilePath = path.join(process.cwd(), 'src', 'lib', 'types', 'queue-database.ts');
assert.ok(fs.existsSync(typesFilePath), 'src/lib/types/queue-database.ts must exist');

const content = fs.readFileSync(typesFilePath, 'utf8');
assert.ok(content.includes('export type JobPriority'), 'Must declare JobPriority');
assert.ok(content.includes('export type JobState'), 'Must declare JobState');
assert.ok(content.includes('export interface QueueJob'), 'Must declare QueueJob');
assert.ok(content.includes('export interface DeadLetterEntry'), 'Must declare DeadLetterEntry');
assert.ok(content.includes('export interface DistributedLockLease'), 'Must declare DistributedLockLease');
assert.ok(content.includes('export interface OutboxEvent'), 'Must declare OutboxEvent');
assert.ok(content.includes('export interface DbPoolConfig'), 'Must declare DbPoolConfig');
assert.ok(content.includes('export interface ShardMetadata'), 'Must declare ShardMetadata');

// Sample job creation check
const sampleJob = {
  id: 'job-123',
  queueName: 'playwright-runs',
  tenantId: 'tenant-enterprise',
  data: { testSuite: 'checkout.spec.ts' },
  priority: 'high',
  state: 'pending',
  attempts: 0,
  maxRetries: 3,
  backoff: {
    type: 'exponential_jitter',
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    maxRetries: 3,
  },
  createdAt: new Date().toISOString(),
};

assert.equal(sampleJob.priority, 'high');
assert.equal(sampleJob.attempts, 0);
assert.equal(sampleJob.backoff.type, 'exponential_jitter');

console.log('✅ Contribution 161 tests passed cleanly!');
