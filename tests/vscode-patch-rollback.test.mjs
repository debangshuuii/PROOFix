import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { PatchManager } from '../extensions/vscode-proofix/src/patch-manager.ts';

console.log('Testing PatchManager Rollback & Restore...');

const manager = new PatchManager();
const tmpRollbackFile = path.resolve('tests/fixtures/sample-rollback-target.txt');

// 1. Initial original state
fs.mkdirSync(path.dirname(tmpRollbackFile), { recursive: true });
const originalText = 'const API_KEY = "verified_stable";\n';
fs.writeFileSync(tmpRollbackFile, originalText, 'utf-8');

const proposal = {
  proposalId: 'prop_rollback_01',
  targetFile: tmpRollbackFile,
  routePath: '/api/v1/keys',
  originalContent: originalText,
  patchedContent: 'const API_KEY = "experimental_broken";\n',
  unifiedDiff: '--- a/keys.txt\n+++ b/keys.txt\n@@ -1 +1 @@\n-stable\n+broken',
  explanation: 'Test rollback mechanism',
  confidence: 0.9,
};

manager.storeProposal(proposal);

// 2. Apply patch
manager.applyPatch('prop_rollback_01');
assert.equal(fs.readFileSync(tmpRollbackFile, 'utf-8').includes('experimental_broken'), true);
assert.equal(manager.hasBackup(tmpRollbackFile), true);

// 3. Rollback patch
const rollbackResult = manager.rollbackPatch(tmpRollbackFile);
assert.equal(rollbackResult.success, true);

// 4. Verify original content restored
const restoredText = fs.readFileSync(tmpRollbackFile, 'utf-8');
assert.equal(restoredText, originalText);
assert.equal(manager.hasBackup(tmpRollbackFile), false, 'Backup file should be unlinked after rollback');

// Cleanup
try {
  fs.unlinkSync(tmpRollbackFile);
} catch {}

console.log('✅ PatchManager Rollback & Restore tests passed!');
