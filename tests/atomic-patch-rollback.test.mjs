import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  applyPatchWithJournal,
  generateReverseDiff,
} from '../src/lib/repair/atomic-patch-applier.ts';
import {
  rollbackTransaction,
  detectDirtyFiles,
  persistTransactionJournal,
  loadTransactionJournal,
} from '../src/lib/repair/rollback-manager.ts';
import {
  createDisposableWorkspace,
  cleanupDisposableWorkspace,
} from '../src/lib/repair/workspace-isolation.ts';

console.log('===========================================================');
console.log('PROOFix Atomic Patch Applier & Rollback Journal Test Suite');
console.log('===========================================================\n');

async function runTests() {
  const sampleDir = path.resolve('src/fixtures/sample-app');
  const tempDir = await createDisposableWorkspace(sampleDir, 'test_tx_rollback');

  try {
    // Test 1: Inverted Reverse-Diff Generation
    console.log('[TEST 1] Generating inverted reverse-diff from unified diff text...');
    const originalDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -6,3 +6,3 @@
-export default function HomePage() {
+export default function PatchedHomePage() {
`;

    const reverseDiff = generateReverseDiff(originalDiff);
    assert.ok(reverseDiff.includes('--- a/src/app/page.tsx'));
    assert.ok(reverseDiff.includes('+export default function HomePage()'));
    assert.ok(reverseDiff.includes('-export default function PatchedHomePage()'));
    console.log('  ✓ Inverted diff generated accurately with swapped hunk operators.');

    // Test 2: Atomic Multi-File Patch Application with Journal
    console.log('\n[TEST 2] Applying patch with comprehensive transaction journal...');
    const pagePath = path.join(tempDir, 'src/app/page.tsx');
    const initialContent = fs.readFileSync(pagePath, 'utf8');

    const applyResult = await applyPatchWithJournal({
      workspacePath: tempDir,
      diffText: originalDiff,
      proposalId: 'prop_tx_01',
      candidateId: 'cand_tx_01',
    });

    assert.strictEqual(applyResult.success, true, 'Patch application must succeed');
    assert.strictEqual(applyResult.journal.status, 'committed');
    assert.strictEqual(applyResult.journal.backupEntries.length, 1);
    assert.ok(applyResult.journal.backupEntries[0].originalHash);
    assert.strictEqual(applyResult.modifiedFiles.length, 1);

    const patchedContent = fs.readFileSync(pagePath, 'utf8');
    assert.ok(patchedContent.includes('PatchedHomePage'));
    console.log('  ✓ Patch committed to workspace with SHA256 backup entry recorded.');

    // Test 3: Dirty State Inspection
    console.log('\n[TEST 3] Detecting dirty files against original transaction backup...');
    const dirtyReports = detectDirtyFiles(applyResult.journal);
    assert.strictEqual(dirtyReports.length, 1);
    assert.strictEqual(dirtyReports[0].isDirty, true, 'File must be flagged dirty after modification');
    console.log('  ✓ Dirty state detected accurately against original transaction hash.');

    // Test 4: Rollback Transaction Recovery
    console.log('\n[TEST 4] Rolling back transaction and asserting byte-level restoration...');
    const rollbackRes = await rollbackTransaction(applyResult.journal, 'Verification failed in CI test');
    assert.strictEqual(rollbackRes.success, true, 'Rollback must complete cleanly');
    assert.strictEqual(rollbackRes.filesRestored.length, 1);

    const restoredContent = fs.readFileSync(pagePath, 'utf8');
    assert.strictEqual(restoredContent, initialContent, 'Restored content must match initial bytes exactly');

    const postRollbackDirty = detectDirtyFiles(applyResult.journal);
    assert.strictEqual(postRollbackDirty[0].isDirty, false, 'File must no longer be dirty after rollback');
    console.log('  ✓ Rollback restored original content byte-for-byte; workspace is 100% clean.');

    // Test 5: Atomic Failure Recovery on Context Mismatch
    console.log('\n[TEST 5] Testing atomic rollback when diff context does not match...');
    const mismatchedDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -999,3 +999,3 @@
-NonExistentLineOfCode12345
+ReplacementLine
`;

    const failApply = await applyPatchWithJournal({
      workspacePath: tempDir,
      diffText: mismatchedDiff,
      proposalId: 'prop_tx_fail',
    });

    assert.strictEqual(failApply.success, false, 'Context mismatch must trigger failure');
    assert.strictEqual(failApply.journal.status, 'rolled_back');
    assert.ok(failApply.error.includes('Context mismatch'));

    const unchangedContent = fs.readFileSync(pagePath, 'utf8');
    assert.strictEqual(unchangedContent, initialContent, 'Workspace must remain completely untouched on failure');
    console.log('  ✓ Failure cleanly trapped with automatic zero-trace rollback.');

    console.log('\n===========================================================');
    console.log('ALL 5 ATOMIC PATCH APPLIER & ROLLBACK TESTS PASSED!');
    console.log('===========================================================');
  } finally {
    await cleanupDisposableWorkspace(tempDir);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
