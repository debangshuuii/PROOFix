import assert from 'node:assert/strict';
import { deriveViewportRecordsFromResults } from '../src/lib/viewport/derive-records.ts';

console.log('--- Testing Viewport Matrix Report UI & Failure Visibility (Contribution 44) ---');

// Test scenario: Desktop run succeeds cleanly, but Mobile run encounters a layout failure
const mockTestResults = [
  {
    id: 'res_desktop_root',
    runId: 'run_mixed_100',
    name: 'Root Application Availability Check',
    category: 'smoke',
    status: 'passed',
    durationMs: 150,
    actualResult: 'Root URL responded HTTP 200 at 1440x900',
    evidence: {
      screenshotPath: '/artifacts/baseline_home.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [],
      viewport: { width: 1440, height: 900 },
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'res_desktop_overflow',
    runId: 'run_mixed_100',
    name: 'Horizontal Viewport Layout & Overflow Check',
    category: 'responsive_layout',
    status: 'passed',
    durationMs: 90,
    actualResult: 'Document fits within 1440px viewport cleanly.',
    evidence: {
      screenshotPath: '/artifacts/baseline_home.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [],
      viewport: { width: 1440, height: 900 },
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'res_tablet_root',
    runId: 'run_mixed_100',
    name: 'Root Application Availability Check',
    category: 'smoke',
    status: 'passed',
    durationMs: 140,
    actualResult: 'Root URL responded HTTP 200 at 768x1024',
    evidence: {
      screenshotPath: '/artifacts/baseline_about.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [],
      viewport: { width: 768, height: 1024 },
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'res_mobile_overflow',
    runId: 'run_mixed_100',
    name: 'Responsive Viewport & Layout Overflow Audit',
    category: 'responsive_layout',
    failureCategory: 'layout_overflow',
    status: 'failed',
    durationMs: 210,
    actualResult: 'Horizontal layout overflow detected at Mobile viewport (390px): scrollWidth (432px) exceeds viewport width.',
    evidence: {
      screenshotPath: '/artifacts/runs/run_mixed_100/test_6_mobile.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [{ name: 'Audit Mobile viewport', status: 'failed', durationMs: 210, error: 'Content exceeds viewport width by 42px' }],
      viewport: { width: 390, height: 844 },
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
];

const records = deriveViewportRecordsFromResults(mockTestResults, 'run_mixed_100');

assert.equal(records.length, 3, 'Must derive records for Desktop, Tablet, and Mobile');

const desktop = records.find((r) => r.profileId === 'desktop-1440x900');
const tablet = records.find((r) => r.profileId === 'tablet-768x1024');
const mobile = records.find((r) => r.profileId === 'mobile-390x844');

assert.ok(desktop, 'Desktop record must exist');
assert.equal(desktop.status, 'passed', 'Desktop run must be PASSED');

assert.ok(tablet, 'Tablet record must exist');
assert.equal(tablet.status, 'passed', 'Tablet run must be PASSED');

assert.ok(mobile, 'Mobile record must exist');
// CRITICAL REQUIREMENT: "Done when: a failed mobile run remains visible even if the desktop run succeeds."
assert.equal(mobile.status, 'failed', 'Mobile run MUST be FAILED even when desktop run succeeded!');
assert.equal(mobile.horizontalOverflow?.detected, true, 'Mobile horizontal overflow must be detected');
assert.ok(mobile.horizontalOverflow.overflowPx > 0, 'Mobile overflow amount must be recorded');
assert.ok(mobile.error?.includes('overflow'), 'Mobile error details must be preserved');
assert.ok(mobile.screenshotPaths.length > 0, 'Mobile screenshot must be present for inspection');

console.log('[PASS] Failed mobile run remains prominently visible while desktop run succeeded.');
console.log(`  -> Desktop: ${desktop.status.toUpperCase()} (${desktop.viewport.width}x${desktop.viewport.height})`);
console.log(`  -> Tablet:  ${tablet.status.toUpperCase()} (${tablet.viewport.width}x${tablet.viewport.height})`);
console.log(`  -> Mobile:  ${mobile.status.toUpperCase()} (${mobile.viewport.width}x${mobile.viewport.height}) - Reason: ${mobile.error}`);

console.log('All Viewport Matrix Report UI tests passed successfully.');
