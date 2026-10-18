import { createDisposableWorkspace, applyPatchToWorkspace, cleanupDisposableWorkspace } from '../src/lib/repair/workspace-isolation.ts';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TEST: Disposable Workspace Isolation & Patch Application ---');

const sourceDir = path.resolve('src/fixtures/sample-app');
const originalPageFile = path.join(sourceDir, 'src/app/page.tsx');
const originalContent = fs.readFileSync(originalPageFile, 'utf-8');

async function testWorkspace() {
  const proposalId = 'test_proposal_iso_01';

  // 1. Create isolated workspace
  const workspaceDir = await createDisposableWorkspace(sourceDir, proposalId);
  assert.ok(fs.existsSync(workspaceDir), 'Disposable workspace must exist');
  assert.ok(workspaceDir.includes('disposable_test_proposal_iso_01'));
  console.log('[PASS] Disposable workspace created at:', workspaceDir);

  // 2. Apply patch in isolated workspace
  const diff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -38,1 +38,1 @@
-          <Link href="/broken-route" style={{ color: '#f87171' }}>Broken Link (404)</Link>
+          <Link href="/about" style={{ color: '#38bdf8' }}>About</Link>`;

  const applyResult = await applyPatchToWorkspace(workspaceDir, diff);
  assert.strictEqual(applyResult.success, true, 'Patch application must succeed');
  assert.strictEqual(applyResult.modifiedFiles[0], 'src/app/page.tsx');
  console.log('[PASS] Patch applied successfully inside disposable workspace.');

  // 3. Verify target file in workspace is updated
  const workspacePageFile = path.join(workspaceDir, 'src/app/page.tsx');
  const workspaceContent = fs.readFileSync(workspacePageFile, 'utf-8');
  assert.ok(workspaceContent.includes('href="/about"'), 'Patched file must contain updated href="/about"');
  console.log('[PASS] Disposable workspace file contains verified patch.');

  // 4. CRITICAL INVARIANT: Original file in sourceDir MUST NOT have changed!
  const currentOriginalContent = fs.readFileSync(originalPageFile, 'utf-8');
  assert.strictEqual(
    originalContent,
    currentOriginalContent,
    'Original checkout MUST NOT be altered when applying patch in disposable workspace'
  );
  console.log('[PASS] INVARIANT CONFIRMED: Original source repository remained 100% untouched!');

  // 5. Cleanup
  await cleanupDisposableWorkspace(workspaceDir);
  assert.ok(!fs.existsSync(workspaceDir), 'Disposable workspace must be removed upon cleanup');
  console.log('[PASS] Disposable workspace cleaned up cleanly.');

  console.log('All workspace-isolation tests passed successfully!\n');
}

testWorkspace().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
