import { validateFixProposal } from '../src/lib/types/proposal.ts';
import assert from 'assert';

console.log('--- TEST: Structured AI Fix Proposal Schema Validation ---');

// Test 1: Valid Proposal
const validSample = {
  failureId: 'fail_res_03',
  commitSha: 'a1b2c3d4e5f6',
  explanation: 'Fix broken navigation link href pointing to missing route /broken-route',
  proposedChanges: `--- a/src/components/Nav.tsx\n+++ b/src/components/Nav.tsx\n@@ -10,1 +10,1 @@\n-<a href="/broken-route">\n+<a href="/about">`,
  affectedFiles: ['src/components/Nav.tsx'],
  confidenceScore: 95,
  validationStatus: 'valid',
};

const res1 = validateFixProposal(validSample);
assert.strictEqual(res1.valid, true, 'Valid proposal should pass');
assert.strictEqual(res1.proposal.confidenceScore, 95);
console.log('[PASS] Valid proposal accepted.');

// Test 2: Reject Invalid Commit SHA
const badSha = { ...validSample, commitSha: 'not-a-valid-sha!' };
const res2 = validateFixProposal(badSha);
assert.strictEqual(res2.valid, false, 'Invalid SHA should fail');
assert.ok(res2.errors.some(e => e.includes('commitSha')));
console.log('[PASS] Malformed commit SHA rejected.');

// Test 3: Reject Path Traversal
const pathTraversal = { ...validSample, affectedFiles: ['../../etc/passwd'] };
const res3 = validateFixProposal(pathTraversal);
assert.strictEqual(res3.valid, false, 'Path traversal should fail');
assert.ok(res3.errors.some(e => e.includes('path traversal')));
console.log('[PASS] Path traversal in affectedFiles rejected.');

// Test 4: Reject Invalid Diff
const badDiff = { ...validSample, proposedChanges: 'just regular plain text with no headers' };
const res4 = validateFixProposal(badDiff);
assert.strictEqual(res4.valid, false, 'Malformed diff should fail');
assert.ok(res4.errors.some(e => e.includes('unified diff format')));
console.log('[PASS] Non-unified diff payload rejected.');

// Test 5: Reject Out-of-Bounds Confidence
const badConfidence = { ...validSample, confidenceScore: 150 };
const res5 = validateFixProposal(badConfidence);
assert.strictEqual(res5.valid, false, 'Confidence > 100 should fail');
console.log('[PASS] Out-of-bounds confidence score rejected.');

console.log('All Fix Proposal schema tests passed successfully!\n');
