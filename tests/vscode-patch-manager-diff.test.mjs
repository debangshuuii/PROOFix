import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  PatchManager,
  formatDiffPreviewTitle,
  getDiffViewerArgs,
} from '../extensions/vscode-proofix/src/patch-manager.ts';

console.log('Testing PatchManager Diff & Atomic Apply...');

const manager = new PatchManager();
const tmpTestFile = path.resolve('tests/fixtures/sample-patch-target.txt');

// Ensure directory and pre-existing content
fs.mkdirSync(path.dirname(tmpTestFile), { recursive: true });
fs.writeFileSync(tmpTestFile, 'Line 1: Original Code\nLine 2: Buggy Line\nLine 3: End\n', 'utf-8');

const proposal = {
  proposalId: 'prop_001',
  targetFile: tmpTestFile,
  routePath: '/checkout',
  originalContent: 'Line 2: Buggy Line',
  patchedContent: 'Line 1: Original Code\nLine 2: Fixed Line (Proven)\nLine 3: End\n',
  unifiedDiff: '--- a/target.txt\n+++ b/target.txt\n@@ -2 +2 @@\n-Line 2: Buggy Line\n+Line 2: Fixed Line (Proven)',
  explanation: 'Fix typo causing state drift',
  confidence: 0.98,
};

manager.storeProposal(proposal);

// Test 1: Diff Viewer Args
const diffArgs = getDiffViewerArgs(proposal);
assert.equal(diffArgs.originalUri, tmpTestFile);
assert.ok(diffArgs.title.includes('PROOFix Proposed Fix: sample-patch-target.txt'));

// Test 2: Atomic Apply
const applyResult = manager.applyPatch('prop_001');
assert.equal(applyResult.success, true);
assert.ok(fs.existsSync(`${tmpTestFile}.proofix.bak`), 'Backup file must exist');

const patchedContent = fs.readFileSync(tmpTestFile, 'utf-8');
assert.ok(patchedContent.includes('Fixed Line (Proven)'));

// Clean up test file and backup
try {
  fs.unlinkSync(tmpTestFile);
  fs.unlinkSync(`${tmpTestFile}.proofix.bak`);
} catch {}

console.log('✅ PatchManager Diff & Atomic Apply tests passed!');
