import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  generateJobSummaryMarkdown,
  writeJobSummary,
} from '../src/action/job-summary.ts';

console.log('--- TEST: GitHub Job Summary Markdown & Graceful Fallbacks ---');

// Test 1: Successful run summary formatting
console.log('[TEST 1] Format successful run summary');
const successData = {
  runId: 'run_sample_pass_123',
  status: 'passed',
  durationMs: 3450,
  summary: { total: 4, passed: 4, failed: 0, blocked: 0, skipped: 0, inconclusive: 0 },
  results: [
    { name: 'Root URL Check', status: 'passed', category: 'smoke' },
    { name: 'About Page', status: 'passed', category: 'user_flow' },
  ],
  reportPaths: {
    html: '/path/to/report.html',
    json: '/path/to/report.json',
  },
};

const successMd = generateJobSummaryMarkdown(successData);
assert.ok(successMd.includes('🟢 **PASSED**'));
assert.ok(successMd.includes('run_sample_pass_123'));
assert.ok(successMd.includes('3.45s'));
assert.ok(successMd.includes('report.html'));
console.log('  -> Successful summary rendered cleanly with duration and links.');

// Test 2: Failed run summary formatting with failure table
console.log('[TEST 2] Format failed run summary with failure table');
const failedData = {
  runId: 'run_sample_fail_456',
  status: 'failed',
  durationMs: 5120,
  summary: { total: 3, passed: 2, failed: 1, blocked: 0, skipped: 0, inconclusive: 0 },
  results: [
    { name: 'Root Check', status: 'passed', category: 'smoke' },
    {
      name: 'Broken Route Check',
      status: 'failed',
      category: 'route_discovery',
      actualResult: 'HTTP 404 Not Found',
      errorDetails: { message: 'Navigation returned 404', url: 'http://localhost:4173/broken' },
    },
  ],
};

const failedMd = generateJobSummaryMarkdown(failedData);
assert.ok(failedMd.includes('🔴 **FAILED**'));
assert.ok(failedMd.includes('Broken Route Check'));
assert.ok(failedMd.includes('Navigation returned 404'));
assert.ok(failedMd.includes('http://localhost:4173/broken'));
console.log('  -> Failure table formatted cleanly with error context.');

// Test 3: Gracefully handles null / undefined / partial data
console.log('[TEST 3] Graceful fallback on missing data');
const nullMd = generateJobSummaryMarkdown(null);
assert.ok(nullMd.includes('No verification telemetry'));

const emptyMd = generateJobSummaryMarkdown({});
assert.ok(emptyMd.includes('unknown_run'));
console.log('  -> Fallbacks handled without throwing errors.');

// Test 4: Write to mock step summary file
console.log('[TEST 4] Append markdown to step summary file');
const mockSummaryFile = path.join(process.cwd(), 'mock_step_summary.tmp');
try {
  await writeJobSummary(successMd, mockSummaryFile);
  assert.ok(fs.existsSync(mockSummaryFile));
  const written = fs.readFileSync(mockSummaryFile, 'utf-8');
  assert.ok(written.includes('PROOFix Verification Summary'));
  console.log('  -> Successfully wrote summary to target step summary file.');
} finally {
  if (fs.existsSync(mockSummaryFile)) fs.unlinkSync(mockSummaryFile);
}

console.log('\n--- All Contribution 25 Job Summary Tests Passed! ---');
