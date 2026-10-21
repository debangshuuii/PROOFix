import assert from 'node:assert/strict';
import { CryptographicAuditLedger, GENESIS_HASH } from '../src/lib/governance/audit-ledger.ts';

console.log('--- Testing Immutable Cryptographic Audit Log Ledger (Contribution 173) ---');

const ledger = new CryptographicAuditLedger();

// 1. Initial State
assert.equal(ledger.getLatestHash(), GENESIS_HASH);

// 2. Append Entries
const entry1 = ledger.append({
  actorId: 'usr-admin-1',
  actorRole: 'super_admin',
  tenantId: 'tenant-enterprise',
  action: 'test_run:triggered',
  resourceType: 'run',
  resourceId: 'run-9001',
  details: { suite: 'auth.spec.ts', concurrency: 4 },
});

assert.equal(entry1.sequenceNumber, 1);
assert.equal(entry1.previousHash, GENESIS_HASH);
assert.ok(entry1.entryHash.length === 64, 'Entry hash should be valid SHA-256');

const entry2 = ledger.append({
  actorId: 'usr-qa-1',
  actorRole: 'qa_lead',
  tenantId: 'tenant-enterprise',
  action: 'healing:approved',
  resourceType: 'pull_request',
  resourceId: 'pr-442',
  details: { patchId: 'fix-cart-overflow' },
});

assert.equal(entry2.sequenceNumber, 2);
assert.equal(entry2.previousHash, entry1.entryHash, 'Entry 2 previousHash must link to Entry 1 entryHash');

const entry3 = ledger.append({
  actorId: 'usr-dev-1',
  actorRole: 'developer',
  tenantId: 'tenant-other',
  action: 'fuzzing:started',
  resourceType: 'fuzz_job',
  resourceId: 'fuzz-55',
});

assert.equal(entry3.sequenceNumber, 3);
assert.equal(entry3.previousHash, entry2.entryHash);
console.log('✅ 3 audit entries appended with continuous SHA-256 hash chaining');

// 3. Verify Ledger Integrity
const integrityOk = ledger.verifyLedgerIntegrity();
assert.equal(integrityOk.valid, true);
assert.equal(integrityOk.totalEntries, 3);
console.log('✅ Cryptographic chain integrity verified cleanly');

// 4. Test Tamper Detection
ledger._simulateTampering(2, 'healing:unauthorized_modification');
const tamperCheck = ledger.verifyLedgerIntegrity();
assert.equal(tamperCheck.valid, false, 'Tampered ledger must fail verification');
assert.equal(tamperCheck.corruptedAtSequence, 2);
assert.ok(tamperCheck.reason.includes('Payload tampering detected'));
console.log('✅ Retrospective ledger tampering detected and flagged at exact sequence');

// 5. Tenant Filtered Retrieval
const cleanLedger = new CryptographicAuditLedger([entry1, entry2, entry3]);
const tenantEntries = cleanLedger.getEntries('tenant-enterprise');
assert.equal(tenantEntries.length, 2);
console.log('✅ Tenant-filtered audit logs retrieved accurately');

console.log('✅ Contribution 173 tests passed cleanly!');
