/**
 * Interactive UI Element Agent Test Suite
 * Validates destructive keyword safety blocking, interactive element scanning,
 * safe event dispatching, and React hydration mismatch classification.
 */

import assert from 'assert';
import {
  classifyDestructiveAction,
  DESTRUCTIVE_KEYWORDS,
} from '../src/lib/testing/interactive-element-scanner.ts';
import {
  executeSafeInteraction,
} from '../src/lib/testing/safe-interaction-executor.ts';
import {
  HYDRATION_ERROR_PATTERNS,
} from '../src/lib/testing/react-hydration-verifier.ts';

console.log('===========================================================');
console.log('PROOFix Interactive UI & State Hydration Agent Test Suite');
console.log('===========================================================\n');

async function runTestSuite() {
  let passed = 0;

  // 1. Destructive Keyword Classification
  console.log('[TEST 1] Destructive Action Keyword Classification');
  const d1 = classifyDestructiveAction('Delete Workspace', 'Permanently remove project');
  assert.strictEqual(d1.isDestructive, true);
  assert.strictEqual(d1.keyword, 'delete');

  const d2 = classifyDestructiveAction('Complete Checkout', 'Pay invoice balance');
  assert.strictEqual(d2.isDestructive, true);

  const safe1 = classifyDestructiveAction('Increment Counter', 'Increase value');
  assert.strictEqual(safe1.isDestructive, false);

  const safe2 = classifyDestructiveAction('Search Documentation', 'Filter topics');
  assert.strictEqual(safe2.isDestructive, false);

  console.log('  ✓ Destructive action classifier accurately identifies dangerous buttons and workflows.');
  passed++;

  // 2. Safe Execution Policy Guardrails
  console.log('[TEST 2] Safety Policy Guardrails: Destructive Action Blocking');
  const mockPage = {};

  const blockedResult = await executeSafeInteraction({
    page: mockPage,
    element: {
      tagName: 'button',
      selector: '#btn-delete-all',
      text: 'Delete All Records',
      safetyTier: 'destructive_blocked',
      isDestructive: true,
      destructiveKeyword: 'delete',
    },
  });

  assert.strictEqual(blockedResult.durationMs, 0, 'Blocked actions must execute in 0ms without dispatch');
  assert.strictEqual(blockedResult.domMutated, false);
  assert.strictEqual(blockedResult.reactStateDispatched, false);
  assert.ok(blockedResult.errorMessage?.includes('Blocked by safe test policy'));

  console.log('  ✓ Zero-trust security policy successfully blocked destructive action from executing.');
  passed++;

  // 3. React Hydration Mismatch Error Detection
  console.log('[TEST 3] React Hydration Mismatch Pattern Verification');
  const ssrMismatchText = 'Hydration failed because the initial UI does not match what was rendered on the server.';
  const matched = HYDRATION_ERROR_PATTERNS.some((p) => p.test(ssrMismatchText));
  assert.strictEqual(matched, true, 'Known Next.js hydration error must be recognized');

  const normalLog = 'Component rendered cleanly in 12ms.';
  const notMatched = HYDRATION_ERROR_PATTERNS.some((p) => p.test(normalLog));
  assert.strictEqual(notMatched, false);

  console.log('  ✓ Hydration error patterns reliably distinguish SSR mismatches from normal logs.');
  passed++;

  console.log('===========================================================');
  console.log(`ALL ${passed} INTERACTIVE UI AGENT TESTS PASSED!`);
  console.log('===========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
