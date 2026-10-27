import assert from 'node:assert/strict';
import {
  linkVideoFailureSteps,
  formatVideoTimestamp,
  formatFailureVideoSectionMarkdown,
} from '../src/action/video-step-linker.ts';

console.log('Testing Failure Video Step Linker...');

// Test 1: Timestamp formatting
assert.equal(formatVideoTimestamp(0), '00:00');
assert.equal(formatVideoTimestamp(75), '01:15');
assert.equal(formatVideoTimestamp(605), '10:05');

// Test 2: Correlating failed steps to video positions
const results = [
  { testId: 'step_1', title: 'Open Homepage', status: 'passed', durationMs: 1000 },
  { testId: 'step_2', title: 'Click Add to Cart', status: 'passed', durationMs: 2000 },
  { testId: 'step_3', title: 'Submit Checkout', status: 'failed', durationMs: 1500, error: 'Payment gateway timed out' },
];

const steps = linkVideoFailureSteps(results, {
  videoUrl: 'https://proofix.dev/recordings/run_01.webm',
});

assert.equal(steps.length, 1, 'Should find 1 failure step');
assert.equal(steps[0].stepIndex, 3);
assert.equal(steps[0].stepName, 'Submit Checkout');
assert.ok(steps[0].videoTimestampSec > 3.0, 'Timestamp should reflect accumulated seconds');
assert.equal(steps[0].errorSnippet, 'Payment gateway timed out');

// Test 3: Markdown table output
const md = formatFailureVideoSectionMarkdown(steps, 'https://proofix.dev/recordings/run_01.webm');
assert.ok(md.includes('Download Playwright Failure Recording'), 'Should include download link');
assert.ok(md.includes('Payment gateway timed out'), 'Should include error cause');
assert.ok(md.includes('#t='), 'Should deep link to timestamp in video');

console.log('✅ Failure Video Step Linker tests passed!');
