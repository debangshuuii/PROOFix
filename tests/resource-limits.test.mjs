import assert from 'node:assert/strict';
import {
  executeBoundedMatrix,
} from '../src/lib/viewport/resource-limits.ts';
import { getDefaultViewportPresets } from '../src/lib/viewport/presets.ts';

console.log('--- Testing Resource Limits & Partial-Failure Preservation (Contribution 49) ---');

const presets = getDefaultViewportPresets();

// Test 1: Partial failure preservation
// Profile 1 (Desktop) succeeds. Profile 2 (Tablet) throws fatal unhandled exception.
// Crucial: Profile 2's failure must NOT erase Profile 1's passed status!
async function testPartialFailure() {
  const result = await executeBoundedMatrix(
    [presets[0], presets[1]], // Desktop & Tablet
    async (profile) => {
      if (profile.id === 'tablet-768x1024') {
        throw new Error('Chromium child process killed by OOM killer or connection reset');
      }
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
        status: 'passed',
        durationMs: 40,
        testResultIds: ['res_1'],
        screenshotPaths: ['/shot.png'],
        emulationNotice: profile.disclaimer,
      };
    },
    { maxConcurrency: 2, profileTimeoutMs: 1000 }
  );

  assert.equal(result.records.length, 2);

  const desktop = result.records.find((r) => r.profileId === 'desktop-1440x900');
  const tablet = result.records.find((r) => r.profileId === 'tablet-768x1024');

  assert.ok(desktop);
  assert.equal(desktop.status, 'passed', 'Completed desktop result MUST be preserved');
  assert.equal(desktop.testResultIds.length, 1);

  assert.ok(tablet);
  assert.equal(tablet.status, 'failed', 'Crashed tablet profile must receive explicit failed status');
  assert.ok(tablet.error?.includes('OOM killer'));

  assert.equal(result.failedProfiles.length, 1);
  assert.equal(result.preservedCompletedCount, 1);
  console.log('[PASS] Fatal profile crash preserved completed results without erasing prior successes.');
}

// Test 2: Timeout guard isolation
// Profile 1 succeeds quickly. Profile 2 hangs.
async function testTimeoutGuard() {
  const result = await executeBoundedMatrix(
    [presets[0], presets[2]], // Desktop & Mobile
    async (profile) => {
      if (profile.id === 'mobile-390x844') {
        // Hang indefinitely
        await new Promise((r) => setTimeout(r, 5000));
      }
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
        status: 'passed',
        durationMs: 30,
        testResultIds: ['res_desktop'],
        screenshotPaths: ['/shot.png'],
        emulationNotice: profile.disclaimer,
      };
    },
    { maxConcurrency: 2, profileTimeoutMs: 120 } // 120ms timeout
  );

  const mobile = result.records.find((r) => r.profileId === 'mobile-390x844');
  const desktop = result.records.find((r) => r.profileId === 'desktop-1440x900');

  assert.ok(desktop);
  assert.equal(desktop.status, 'passed', 'Desktop run preserved despite mobile timeout');

  assert.ok(mobile);
  assert.equal(mobile.status, 'timeout', 'Timed out profile receives explicit timeout status');
  assert.ok(mobile.error?.includes('exceeded timeout limit of 120ms'));
  assert.ok(result.timedOutProfiles.includes('mobile-390x844'));
  console.log('[PASS] Profile timeout guard handled with explicit status and non-destructive isolation.');
}

// Test 3: Profile count bounding
// When too many profiles are requested, excess profiles are capped with explicit skipped status
async function testProfileBounding() {
  const customList = [
    ...presets,
    { ...presets[0], id: 'extra-1', name: 'Extra 1' },
    { ...presets[0], id: 'extra-2', name: 'Extra 2' },
    { ...presets[0], id: 'extra-3', name: 'Extra 3' },
  ];

  const result = await executeBoundedMatrix(
    customList,
    async (profile) => ({
      profileId: profile.id,
      profileName: profile.name,
      viewport: { width: profile.width, height: profile.height, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
      status: 'passed',
      durationMs: 10,
      testResultIds: [],
      screenshotPaths: [],
      emulationNotice: profile.disclaimer,
    }),
    { maxProfiles: 3, maxConcurrency: 2 }
  );

  assert.equal(result.records.length, 6);
  const executed = result.records.filter((r) => r.status === 'passed');
  const skipped = result.records.filter((r) => r.status === 'skipped');

  assert.equal(executed.length, 3, 'Exactly maxProfiles executed');
  assert.equal(skipped.length, 3, 'Excess profiles capped and marked skipped');
  assert.ok(skipped[0].error?.includes('exceeded the configured max profile limit of 3'));
  console.log('[PASS] Profile count bounded to prevent resource exhaustion.');
}

async function runAll() {
  await testPartialFailure();
  await testTimeoutGuard();
  await testProfileBounding();
  console.log('All Resource Limits & Partial Failure tests passed successfully.');
}

runAll().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
