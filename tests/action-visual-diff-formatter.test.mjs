import assert from 'node:assert/strict';
import {
  formatVisualDiffDetailsMarkdown,
  formatPixelDiscrepancyBadge,
  summarizeVisualDiscrepancies,
} from '../src/action/visual-diff-formatter.ts';

console.log('Testing Visual Diff Details Formatter...');

// Test 1: Empty diffs
const emptyOutput = formatVisualDiffDetailsMarkdown([]);
assert.ok(emptyOutput.includes('No UI regressions detected'), 'Empty diffs should state no regressions');

// Test 2: Formatting multiple diffs into Markdown table
const diffs = [
  {
    testId: 'diff_1',
    route: '/pricing',
    baselineScreenshotUrl: 'https://proofix.dev/base1.png',
    currentScreenshotUrl: 'https://proofix.dev/curr1.png',
    diffScreenshotUrl: 'https://proofix.dev/diff1.png',
    mismatchPixels: 350,
    mismatchPercentage: 2.4,
    passed: false,
  },
  {
    testId: 'diff_2',
    route: '/contact',
    mismatchPixels: 0,
    mismatchPercentage: 0,
    passed: true,
  },
];

const md = formatVisualDiffDetailsMarkdown(diffs, 'https://proofix.dev/preview.html');
assert.ok(md.includes('<details>'), 'Should wrap in collapsible <details>');
assert.ok(md.includes('` /pricing `'.replace(/\s/g, '')), 'Should list pricing route');
assert.ok(md.includes('350 px'), 'Should list pixel count');
assert.ok(md.includes('https://proofix.dev/preview.html'), 'Should link to proof preview');

// Test 3: Discrepancy summaries
const summary = summarizeVisualDiscrepancies(diffs);
assert.equal(summary.totalMismatchPixels, 350);
assert.equal(summary.maxMismatchPct, 2.4);
assert.equal(summary.passedCount, 1);
assert.equal(summary.failedCount, 1);

// Test 4: Badge formatting
assert.ok(formatPixelDiscrepancyBadge(0, 0).includes('✅'));
assert.ok(formatPixelDiscrepancyBadge(500, 2.5).includes('Severe Regression'));

console.log('✅ Visual Diff Details Formatter tests passed!');
