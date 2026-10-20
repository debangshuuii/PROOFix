import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { applyPatchAtomically } from '../src/lib/repair/patch-applier.ts';

console.log('--- Testing Atomic Patch Applier & Conflict Detector (Contribution 5 / 105) ---');

function testAtomicPatchApplication() {
  const tempDir = path.join(process.cwd(), 'scratch', 'test_atomic_workspace');
  fs.mkdirSync(tempDir, { recursive: true });

  const file1Path = path.join(tempDir, 'file1.ts');
  const file2Path = path.join(tempDir, 'file2.ts');

  fs.writeFileSync(file1Path, 'const x = 10;\nconst y = 20;\nconst z = x + y;\n', 'utf8');
  fs.writeFileSync(file2Path, 'function greet() {\n  return "hi";\n}\n', 'utf8');

  try {
    // 1. Successful Clean Multi-File Patch
    const validDiff = `
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,3 @@
 const x = 10;
-const y = 20;
+const y = 99;
 const z = x + y;
--- a/file2.ts
+++ b/file2.ts
@@ -1,3 +1,3 @@
 function greet() {
-  return "hi";
+  return "hello world";
 }
    `.trim();

    const result = applyPatchAtomically(tempDir, validDiff);
    assert.equal(result.success, true);
    assert.equal(result.appliedFiles.length, 2);
    assert.ok(fs.readFileSync(file1Path, 'utf8').includes('const y = 99;'));
    assert.ok(fs.readFileSync(file2Path, 'utf8').includes('return "hello world";'));
    console.log('[PASS] Multi-file patch applied cleanly and verified on disk.');

    // 2. Conflict Handling & Atomicity
    // file1 now has 'const y = 99', but diff expects 'const y = 20' (stale context)
    const conflictingDiff = `
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,3 @@
 const x = 10;
-const y = 20;
+const y = 500;
 const z = x + y;
--- a/file2.ts
+++ b/file2.ts
@@ -1,3 +1,3 @@
 function greet() {
-  return "hello world";
+  return "mutated";
 }
    `.trim();

    const conflictResult = applyPatchAtomically(tempDir, conflictingDiff);
    assert.equal(conflictResult.success, false);
    assert.ok(conflictResult.conflictErrors.length > 0);
    assert.ok(conflictResult.conflictErrors[0].includes('Conflict'));

    // Atomicity check: file2 must NOT have been mutated even though its hunk was valid!
    assert.equal(fs.readFileSync(file2Path, 'utf8').includes('mutated'), false);
    assert.ok(fs.readFileSync(file2Path, 'utf8').includes('hello world'));
    console.log('[PASS] Conflict detected and atomicity enforced: zero files mutated on hunk conflict.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runSuite() {
  testAtomicPatchApplication();
  console.log('[ALL PASS] Contribution 5 (105) test suite passed.');
}

runSuite();
