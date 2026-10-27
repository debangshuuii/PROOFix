import assert from 'node:assert/strict';
import {
  generateAutoFixDispatchLink,
  formatAutoFixSectionMarkdown,
} from '../src/action/autofix-dispatch-generator.ts';

console.log('Testing Prove & Auto-Fix Dispatch Generator...');

const link = generateAutoFixDispatchLink({
  repoOwner: 'debangshuuii',
  repoName: 'PROOFix',
  workflowFile: 'proofix-autofix.yml',
  branchName: 'feat/checkout-repair',
  prNumber: 42,
  runId: 'run_fix_test',
});

assert.equal(link.workflowName, 'proofix-autofix.yml');
assert.equal(link.branchName, 'feat/checkout-repair');
assert.ok(link.dispatchUrl.includes('debangshuuii/PROOFix/actions/workflows/proofix-autofix.yml'));
assert.ok(link.dispatchUrl.includes('ref=feat%2Fcheckout-repair'));

// Test Markdown formatting
const md = formatAutoFixSectionMarkdown(link);
assert.ok(md.includes('Self-Healing Auto-Repair Available'));
assert.ok(md.includes('Prove_%26_Auto--Fix'));
assert.ok(md.includes('feat/checkout-repair'));

// Test null case
assert.equal(formatAutoFixSectionMarkdown(undefined), '');

console.log('✅ Prove & Auto-Fix Dispatch Generator tests passed!');
