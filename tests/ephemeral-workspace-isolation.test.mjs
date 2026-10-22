import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  provisionEphemeralWorkspace,
  verifyPathSecurity,
  calculateDirSizeMb,
  teardownEphemeralWorkspace,
} from '../src/lib/repair/ephemeral-workspace-manager.ts';
import {
  createDisposableWorkspace,
  applyPatchToWorkspace,
  cleanupDisposableWorkspace,
} from '../src/lib/repair/workspace-isolation.ts';

console.log('===========================================================');
console.log('PROOFix Ephemeral Workspace & Isolation Security Test Suite');
console.log('===========================================================\n');

async function runTests() {
  const sampleDir = path.resolve('src/fixtures/sample-app');
  assert.ok(fs.existsSync(sampleDir), 'Sample fixture app directory must exist');

  // Test 1: Path Traversal & Forbidden Pattern Security Guard
  console.log('[TEST 1] Verifying Path Security and Symlink Jail Guards...');
  const fakeRoot = path.resolve('data/ephemeral_workspaces/dummy_test_root');
  
  const escapeCheck = verifyPathSecurity(fakeRoot, '../../etc/passwd');
  assert.strictEqual(escapeCheck.safe, false, 'Path traversal must be flagged unsafe');
  assert.strictEqual(escapeCheck.violation?.type, 'path-traversal');

  const gitCheck = verifyPathSecurity(fakeRoot, '.git/config');
  assert.strictEqual(gitCheck.safe, false, 'Access to .git must be blocked');
  assert.strictEqual(gitCheck.violation?.type, 'forbidden-write');

  const envCheck = verifyPathSecurity(fakeRoot, '.env.production');
  assert.strictEqual(envCheck.safe, false, 'Access to .env files must be blocked');
  assert.strictEqual(envCheck.violation?.type, 'forbidden-write');

  const safeCheck = verifyPathSecurity(fakeRoot, 'src/components/Button.tsx');
  assert.strictEqual(safeCheck.safe, true, 'Regular source file paths must be permitted');
  console.log('  ✓ Path traversal and sensitive target boundaries verified.');

  // Test 2: Provision Ephemeral Workspace Snapshot
  console.log('\n[TEST 2] Provisioning isolated copy-on-write workspace snapshot...');
  const snapshot = await provisionEphemeralWorkspace({
    sourceDir: sampleDir,
    proposalId: 'prop_test_01',
    policy: { maxDiskQuotaMb: 100 },
  });

  assert.ok(snapshot.id.startsWith('proofix_sandbox_'), 'Snapshot ID must have sandbox prefix');
  assert.strictEqual(snapshot.mode, 'copy-on-write');
  assert.strictEqual(snapshot.status, 'ready');
  assert.ok(fs.existsSync(snapshot.isolatedPath), 'Sandbox directory must exist on disk');
  
  // Verify isolated copy has page.tsx
  const isolatedPage = path.join(snapshot.isolatedPath, 'src/app/page.tsx');
  assert.ok(fs.existsSync(isolatedPage), 'Target file page.tsx must be cloned into workspace');

  const sizeMb = calculateDirSizeMb(snapshot.isolatedPath);
  assert.ok(sizeMb > 0 && sizeMb < 100, `Directory size ${sizeMb.toFixed(2)}MB must be within quota`);
  console.log(`  ✓ Workspace snapshot provisioned (${sizeMb.toFixed(2)}MB) at: ${snapshot.id}`);

  // Test 3: Disposable Workspace and Atomic Patch Application
  console.log('\n[TEST 3] Applying atomic patch within disposable workspace...');
  const disposableDir = await createDisposableWorkspace(sampleDir, 'test_eval_run');
  assert.ok(fs.existsSync(disposableDir), 'Disposable workspace directory must exist');

  const validDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -6,3 +6,3 @@
-export default function HomePage() {
+export default function PatchedHomePage() {
`;

  const applyResult = await applyPatchToWorkspace(disposableDir, validDiff);
  assert.strictEqual(applyResult.success, true, 'Patch application in sandbox must succeed');
  assert.ok(applyResult.modifiedFiles.includes('src/app/page.tsx'), 'page.tsx must be recorded as modified');

  const modifiedContent = fs.readFileSync(path.join(disposableDir, 'src/app/page.tsx'), 'utf-8');
  assert.ok(modifiedContent.includes('export default function PatchedHomePage()'), 'Content must reflect applied patch');

  // Verify source fixture is completely untouched!
  const originalContent = fs.readFileSync(path.join(sampleDir, 'src/app/page.tsx'), 'utf-8');
  assert.ok(!originalContent.includes('PatchedHomePage'), 'Original source fixture must remain untouched');
  console.log('  ✓ Patch cleanly applied to isolated workspace; original fixture strictly immutable.');

  // Test 4: Teardown and Cleanup
  console.log('\n[TEST 4] Tearing down sandboxes and asserting directory cleanup...');
  const cleanupSnapshot = await teardownEphemeralWorkspace(snapshot);
  assert.strictEqual(cleanupSnapshot.success, true, 'Teardown must succeed');
  assert.strictEqual(fs.existsSync(snapshot.isolatedPath), false, 'Sandbox directory must be deleted');

  await cleanupDisposableWorkspace(disposableDir);
  assert.strictEqual(fs.existsSync(disposableDir), false, 'Disposable directory must be deleted');
  console.log('  ✓ Sandboxes torn down with zero file residue.');

  console.log('\n===========================================================');
  console.log('ALL 4 EPHEMERAL WORKSPACE & ISOLATION TESTS PASSED!');
  console.log('===========================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
