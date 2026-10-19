import assert from 'node:assert/strict';
import { runMultiViewportVerification } from '../src/lib/viewport/runner.ts';
import { getDefaultViewportPresets } from '../src/lib/viewport/presets.ts';

console.log('--- Testing Playwright Multi-Viewport Runner (Contribution 43) ---');

async function testRunner() {
  const presets = getDefaultViewportPresets();
  const runId = `run_matrix_test_${Date.now()}`;

  const result = await runMultiViewportVerification({
    runId,
    baseUrl: 'http://localhost:3000',
    routes: [{ path: '/', type: 'page', fileSource: 'src/app/page.tsx', isDynamic: false }],
    viewportProfiles: presets,
    mockBrowser: true, // Use simulation mode for deterministic fast testing
  });

  // Verify runId
  assert.equal(result.runId, runId);

  // Verify 3 profiles executed
  assert.equal(result.summary.totalProfiles, 3);
  assert.equal(result.profileRecords.length, 3);

  // Verify each profile has its own execution record
  const desktopRecord = result.profileRecords.find((r) => r.profileId === 'desktop-1440x900');
  const tabletRecord = result.profileRecords.find((r) => r.profileId === 'tablet-768x1024');
  const mobileRecord = result.profileRecords.find((r) => r.profileId === 'mobile-390x844');

  assert.ok(desktopRecord, 'Desktop record must exist');
  assert.equal(desktopRecord.viewport.width, 1440);
  assert.equal(desktopRecord.viewport.height, 900);
  assert.ok(desktopRecord.screenshotPaths.length > 0);
  assert.ok(desktopRecord.testResultIds.length > 0);
  assert.ok(desktopRecord.emulationNotice.includes('Viewport Preset'));

  assert.ok(tabletRecord, 'Tablet record must exist');
  assert.equal(tabletRecord.viewport.width, 768);
  assert.equal(tabletRecord.viewport.height, 1024);
  assert.equal(tabletRecord.viewport.isMobile, true);
  assert.equal(tabletRecord.viewport.hasTouch, true);

  assert.ok(mobileRecord, 'Mobile record must exist');
  assert.equal(mobileRecord.viewport.width, 390);
  assert.equal(mobileRecord.viewport.height, 844);
  assert.equal(mobileRecord.viewport.isMobile, true);
  assert.equal(mobileRecord.viewport.hasTouch, true);

  console.log('[PASS] Each enabled viewport profile generated its own distinct execution record.');

  // Verify screenshot metadata
  assert.equal(result.screenshotMetadata.length, 3);
  for (const shot of result.screenshotMetadata) {
    assert.ok(shot.id.startsWith(`shot_${runId}_`));
    assert.ok(shot.viewport.width > 0);
    assert.ok(shot.viewport.height > 0);
    assert.ok(shot.filePath.endsWith('.png'));
  }
  console.log('[PASS] Screenshot metadata successfully indexed for every viewport profile.');

  // Verify test results are partitioned with viewport info
  assert.ok(result.results.length >= 6);
  for (const res of result.results) {
    assert.ok(res.evidence.viewport?.width, 'Evidence must contain viewport width');
    assert.ok(res.evidence.viewport?.height, 'Evidence must contain viewport height');
  }
  console.log('[PASS] Test results contain isolated viewport evidence.');

  // Clean up temporary test artifacts
  const runArtifactsDir = `public/artifacts/runs/${runId}`;
  if (fs.existsSync(runArtifactsDir)) {
    fs.rmSync(runArtifactsDir, { recursive: true, force: true });
  }

  console.log('All Viewport Runner tests passed successfully.');
}

testRunner().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
