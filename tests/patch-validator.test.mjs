import { validatePatchIntegrity, parseUnifiedDiff } from '../src/lib/repair/patch-validator.ts';
import assert from 'assert';

console.log('--- TEST: Patch Integrity & Security Validation ---');

const repoRoot = process.cwd();

// Test 1: Valid patch against existing sample file
const validDiff = `--- a/src/fixtures/sample-app/src/app/page.tsx
+++ b/src/fixtures/sample-app/src/app/page.tsx
@@ -37,3 +37,3 @@
-          <Link href="/broken-route" style={{ color: '#f87171' }}>Broken Link (404)</Link>
+          <Link href="/about" style={{ color: '#38bdf8' }}>About Us</Link>`;

const res1 = validatePatchIntegrity(validDiff, repoRoot);
assert.strictEqual(res1.valid, true, 'Valid patch should pass');
assert.strictEqual(res1.errors.length, 0);
console.log('[PASS] Valid patch passed integrity verification.');

// Test 2: Reject Path Traversal
const pathTraversalDiff = `--- a/../../windows/system32/cmd.exe
+++ b/../../windows/system32/cmd.exe
@@ -1,1 +1,1 @@
-bad
+evil`;

const res2 = validatePatchIntegrity(pathTraversalDiff, repoRoot);
assert.strictEqual(res2.valid, false, 'Path traversal must be rejected');
assert.ok(res2.errors.some((e) => e.includes('path traversal')));
console.log('[PASS] Path traversal attempt safely rejected.');

// Test 3: Reject modifying .env or .git files
const envDiff = `--- a/.env
+++ b/.env
@@ -1,1 +1,1 @@
-API_KEY=123
+API_KEY=hacked`;

const res3 = validatePatchIntegrity(envDiff, repoRoot);
assert.strictEqual(res3.valid, false, 'Modifying .env must be rejected');
assert.ok(res3.errors.some((e) => e.includes('environment or secret configuration')));
console.log('[PASS] Secret configuration patch safely rejected.');

// Test 4: Reject disallowed extension (.sh or .exe)
const scriptDiff = `--- a/src/fixtures/sample-app/malicious.sh
+++ b/src/fixtures/sample-app/malicious.sh
@@ -1,1 +1,1 @@
+echo hacked`;

const res4 = validatePatchIntegrity(scriptDiff, repoRoot);
assert.strictEqual(res4.valid, false, 'Disallowed extension must be rejected');
assert.ok(res4.errors.some((e) => e.includes('allowed source filetypes')));
console.log('[PASS] Disallowed executable script extension rejected.');

// Test 5: Reject stale patch (mismatched context lines)
const staleDiff = `--- a/src/fixtures/sample-app/src/app/page.tsx
+++ b/src/fixtures/sample-app/src/app/page.tsx
@@ -10,2 +10,2 @@
-This line definitely does not exist in page.tsx at all!
+Replacement line`;

const res5 = validatePatchIntegrity(staleDiff, repoRoot);
assert.strictEqual(res5.valid, false, 'Stale patch with mismatched context must be rejected');
assert.ok(res5.errors.some((e) => e.includes('Stale patch detected')));
console.log('[PASS] Stale patch with invalid context safely rejected.');

console.log('All patch-validator tests passed successfully!\n');
