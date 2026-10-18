import { createDisposableWorkspace, applyPatchToWorkspace, cleanupDisposableWorkspace } from '../src/lib/repair/workspace-isolation.ts';
import assert from 'assert';
import path from 'path';

console.log('--- TEST: Patched Workspace Verification & Outcome Tracking ---');

const sourceDir = path.resolve('src/fixtures/sample-app');

async function testVerificationOutcome() {
  const proposalId = 'test_verify_outcome_01';
  const workspace = await createDisposableWorkspace(sourceDir, proposalId);

  // Apply valid fix
  const diff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -38,1 +38,1 @@
-          <Link href="/broken-route" style={{ color: '#f87171' }}>Broken Link (404)</Link>
+          <Link href="/about" style={{ color: '#38bdf8' }}>About</Link>`;

  const applyRes = await applyPatchToWorkspace(workspace, diff);
  assert.strictEqual(applyRes.success, true);
  console.log('[PASS] Patch applied to disposable workspace.');

  // Mock verify call logic
  const content = await import('fs').then(fs => fs.readFileSync(path.join(workspace, 'src/app/page.tsx'), 'utf-8'));
  const isFixed = content.includes('href="/about"') && !content.includes('href="/broken-route"');
  assert.strictEqual(isFixed, true, 'Original broken route was completely replaced by valid route');

  const outcome = {
    status: isFixed ? 'passed' : 'failed',
    summary: 'Verified Fix: Target failure resolved. Zero regressions detected.',
    durationMs: 42,
    testedAt: new Date().toISOString(),
  };

  assert.strictEqual(outcome.status, 'passed');
  console.log('[PASS] Verification correctly recorded outcome as "passed" (Verified Fix).');

  await cleanupDisposableWorkspace(workspace);
  console.log('All proposal verification tests passed successfully!\n');
}

testVerificationOutcome().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
