import assert from 'node:assert/strict';
import { DataRetentionManager } from '../src/lib/governance/data-retention.ts';

console.log('--- Testing Sensitive Data Redaction & Data Retention Lifecycles (Contribution 176) ---');

const manager = new DataRetentionManager();

// 1. Text PII Redaction
const rawLog = 'User john.doe@acme-corp.com with SSN 123-45-6789 and Card 4532111122223333 called 555-123-4567 Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';

const cleanLog = manager.redactPii(rawLog);
assert.ok(!cleanLog.includes('john.doe@acme-corp.com'), 'Email must be redacted');
assert.ok(cleanLog.includes('[REDACTED_EMAIL]'));
assert.ok(!cleanLog.includes('123-45-6789'), 'SSN must be redacted');
assert.ok(cleanLog.includes('[REDACTED_SSN]'));
assert.ok(!cleanLog.includes('4532111122223333'), 'Credit card must be redacted');
assert.ok(cleanLog.includes('[REDACTED_CREDIT_CARD]'));
assert.ok(!cleanLog.includes('555-123-4567'), 'Phone must be redacted');
assert.ok(cleanLog.includes('[REDACTED_PHONE]'));
assert.ok(cleanLog.includes('Bearer [REDACTED_JWT]'), 'Bearer token must be redacted');
console.log('✅ String PII redaction verified for email, SSN, card, phone, and tokens');

// 2. Recursive JSON Object Redaction
const rawPayload = {
  user: {
    name: 'Jane Doe',
    email: 'jane@enterprise.io',
    userPassword: 'plaintext-secret-pass',
  },
  clientSecret: 'secret_live_key',
  meta: {
    comments: 'Customer SSN: 987-65-4321',
  },
};

const cleanObj = manager.redactObject(rawPayload);
assert.equal(cleanObj.user.email, '[REDACTED_EMAIL]');
assert.equal(cleanObj.user.userPassword, '[REDACTED_SECRET]');
assert.equal(cleanObj.clientSecret, '[REDACTED_SECRET]');
assert.ok(cleanObj.meta.comments.includes('[REDACTED_SSN]'));
console.log('✅ Recursive JSON object secret and PII scrub verified');

// 3. TTL Retention Expiration Check
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const policy = {
  tenantId: 'tenant-enterprise',
  testRunTtlDays: 30,
  sessionVideoTtlDays: 7,
  auditLogTtlDays: 365,
  piiMaskingEnabled: true,
};

const oldVideo = { id: 'vid-1', createdAt: new Date(now - 10 * dayMs).toISOString(), type: 'session_video' };
const freshVideo = { id: 'vid-2', createdAt: new Date(now - 3 * dayMs).toISOString(), type: 'session_video' };
const oldRun = { id: 'run-1', createdAt: new Date(now - 35 * dayMs).toISOString(), type: 'test_run' };
const auditLog = { id: 'audit-1', createdAt: new Date(now - 100 * dayMs).toISOString(), type: 'audit_log' };

assert.equal(manager.isRecordExpired(oldVideo, policy, now), true, '10-day old video should expire (limit: 7)');
assert.equal(manager.isRecordExpired(freshVideo, policy, now), false, '3-day old video should be retained');
assert.equal(manager.isRecordExpired(oldRun, policy, now), true, '35-day run should expire (limit: 30)');
assert.equal(manager.isRecordExpired(auditLog, policy, now), false, '100-day audit log retained (limit: 365)');
console.log('✅ Record expiration matches tenant TTL policies');

// 4. Purge Expired Records
const records = [oldVideo, freshVideo, oldRun, auditLog];
const purgeResult = manager.purgeExpiredRecords(records, policy, now);
assert.equal(purgeResult.purgedCount, 2);
assert.equal(purgeResult.retained.length, 2);
assert.ok(purgeResult.retained.some((r) => r.id === 'vid-2'));
assert.ok(purgeResult.retained.some((r) => r.id === 'audit-1'));
console.log('✅ Automated TTL purge successfully cleaned expired records');

console.log('✅ Contribution 176 tests passed cleanly!');
