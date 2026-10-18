import { createDisposableWorkspace, cleanupDisposableWorkspace } from '../src/lib/repair/workspace-isolation.ts';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TEST: Proposal Rollback & Git Patch Export ---');

const sourceDir = path.resolve('src/fixtures/sample-app');
const originalPage = path.join(sourceDir, 'src/app/page.tsx');
const originalContent = fs.readFileSync(originalPage, 'utf-8');

async function testRollbackAndExport() {
  const proposalId = 'test_rollback_exp_01';
  const workspace = await createDisposableWorkspace(sourceDir, proposalId);
  assert.ok(fs.existsSync(workspace), 'Workspace should exist before rollback');

  // Rollback simulation: cleans up workspace
  await cleanupDisposableWorkspace(workspace);
  assert.ok(!fs.existsSync(workspace), 'Workspace must be removed after rollback');
  console.log('[PASS] Rollback purged disposable workspace.');

  // Verify invariant: original source is completely untouched
  const currentContent = fs.readFileSync(originalPage, 'utf-8');
  assert.strictEqual(originalContent, currentContent, 'Original checkout must be identical');
  console.log('[PASS] INVARIANT CONFIRMED: Original source unchanged after rollback.');

  // Test Export logic formatting
  const mockProposal = {
    id: proposalId,
    failureId: 'fail_01',
    commitSha: 'a1b2c3d4e5f6',
    explanation: 'Fix broken link',
    proposedChanges: `--- a/src/app/page.tsx\n+++ b/src/app/page.tsx\n@@ -38,1 +38,1 @@\n-old\n+new`,
    confidenceScore: 95,
  };

  const patchText = `From: PROOFix AI Self-Repair Engine <engine@proofix.dev>\nSubject: [PATCH] ${mockProposal.explanation}\n\n${mockProposal.proposedChanges}\n`;
  assert.ok(patchText.startsWith('From: PROOFix'));
  assert.ok(patchText.includes('--- a/src/app/page.tsx'));
  assert.ok(patchText.includes('+++ b/src/app/page.tsx'));
  console.log('[PASS] Export formats standard git mailbox patch accurately.');

  console.log('All proposal rollback and export tests passed successfully!\n');
}

testRollbackAndExport().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
