import assert from 'node:assert/strict';
import {
  isProofixStickyComment,
  wrapWithStickyMarker,
  extractPreviousRunId,
  STICKY_COMMENT_MARKER,
} from '../src/action/sticky-comment-marker.ts';

console.log('Testing Sticky PR Comment Marker...');

// Test 1: Wrap content with sticky marker and run ID
const wrapped = wrapWithStickyMarker('## Summary Report', 'run_test_123');
assert.ok(wrapped.includes(STICKY_COMMENT_MARKER), 'Should contain marker');
assert.ok(wrapped.includes('<!-- proofix-run-id:run_test_123 -->'), 'Should contain run ID marker');
assert.ok(wrapped.includes('## Summary Report'), 'Should contain content body');

// Test 2: Detect PROOFix sticky comments
assert.equal(isProofixStickyComment(wrapped), true, 'Wrapped text must be recognized');
assert.equal(isProofixStickyComment('Regular human comment on PR'), false, 'Non-bot comment must not match');

// Test 3: Extract previous run ID
const extracted = extractPreviousRunId(wrapped);
assert.equal(extracted, 'run_test_123', 'Extracted run ID should match original');

console.log('✅ Sticky PR Comment Marker tests passed!');
