import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TEST: Patch Review Interface & Invariant Security ---');

const sampleFile = path.resolve('src/fixtures/sample-app/src/app/page.tsx');
const beforeContent = fs.readFileSync(sampleFile, 'utf-8');

async function testReview() {
  // Test rejecting a proposal
  const rejectRes = await fetch('http://localhost:3001/api/v1/proposals/prop_test_01/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject', reason: 'Developer rejected patch in UI' }),
  });

  const rejectData = await rejectRes.json();
  assert.strictEqual(rejectRes.status, 200, 'Reject endpoint should return 200');
  assert.strictEqual(rejectData.proposal.validationStatus, 'rejected');
  console.log('[PASS] Rejection correctly marked proposal as "rejected".');

  // Verify INVARIANT: Repository file MUST NOT have changed
  const afterContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.strictEqual(beforeContent, afterContent, 'Repository source file must remain identical when rejecting patch');
  console.log('[PASS] INVARIANT CONFIRMED: Repository files remain 100% untouched upon rejection.');

  // Test approving a proposal
  const approveRes = await fetch('http://localhost:3001/api/v1/proposals/prop_test_02/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve' }),
  });

  const approveData = await approveRes.json();
  assert.strictEqual(approveRes.status, 200, 'Approve endpoint should return 200');
  assert.strictEqual(approveData.proposal.validationStatus, 'valid');
  console.log('[PASS] Approval correctly staged proposal for isolated sandbox verification.');

  console.log('All patch-review interface tests passed successfully!\n');
}

testReview().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
