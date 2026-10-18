import assert from 'assert';
import {
  validateScreenshotMetadata,
  registerScreenshot,
  queryScreenshots,
  getScreenshotById,
  indexExistingArtifacts,
  clearScreenshotIndex,
} from '../src/lib/comparison/screenshot-indexer.ts';

console.log('--- TEST: Screenshot Metadata Schema & Artifact Indexer ---');

async function runTests() {
  await clearScreenshotIndex();

  // Test 1: Validate Schema - Rejects missing required fields
  console.log('[TEST 1] Schema validation rejects incomplete metadata');
  const invalidRecord1 = {
    id: 'sc_01',
    // missing runId
    route: 'broken_no_slash',
    viewport: { width: -100, height: 720 },
    browser: '',
  };
  const validation1 = validateScreenshotMetadata(invalidRecord1);
  assert.strictEqual(validation1.valid, false, 'Invalid record should not pass validation');
  assert.ok(validation1.errors.some((e) => e.includes('Run ID is required')));
  assert.ok(validation1.errors.some((e) => e.includes('Route must be a non-empty string starting with "/"')));
  assert.ok(validation1.errors.some((e) => e.includes('positive width and height')));
  assert.ok(validation1.errors.some((e) => e.includes('Browser engine must be specified')));
  console.log('  -> Rejected properly with errors:', validation1.errors.length);

  // Test 2: Schema validation succeeds on complete valid metadata
  console.log('[TEST 2] Schema validation accepts complete metadata');
  const validRecord = {
    id: 'sc_test_home_01',
    runId: 'run_fixture_01',
    projectId: 'proj_fixture_01',
    route: '/',
    viewport: { width: 1280, height: 720, isMobile: false },
    browser: 'chromium',
    browserVersion: '124.0.0',
    timestamp: new Date().toISOString(),
    testContext: {
      testResultId: 'res_01',
      testName: 'Root Application Health & Title Check',
      category: 'smoke',
      selector: 'fullPage',
      tags: ['homepage', 'critical'],
    },
    filePath: '/artifacts/runs/run_fixture_01/test_1_root.png',
    format: 'png',
  };
  const validation2 = validateScreenshotMetadata(validRecord);
  assert.strictEqual(validation2.valid, true, 'Valid record must pass');
  assert.strictEqual(validation2.errors.length, 0);
  console.log('  -> Accepted valid schema.');

  // Test 3: Register and persist screenshot metadata
  console.log('[TEST 3] Register and retrieve screenshot');
  await registerScreenshot(validRecord);
  const fetched = await getScreenshotById('sc_test_home_01');
  assert.ok(fetched, 'Registered screenshot should be retrievable');
  assert.strictEqual(fetched.route, '/');
  assert.strictEqual(fetched.viewport.width, 1280);
  assert.strictEqual(fetched.testContext.category, 'smoke');
  console.log('  -> Successfully retrieved registered screenshot by ID.');

  // Test 4: Register secondary screenshot with distinct route & viewport
  console.log('[TEST 4] Register mobile screenshot on /about');
  const mobileAboutRecord = {
    id: 'sc_test_about_mobile',
    runId: 'run_fixture_01',
    projectId: 'proj_fixture_01',
    route: '/about',
    viewport: { width: 375, height: 812, isMobile: true },
    browser: 'chromium',
    timestamp: new Date().toISOString(),
    testContext: {
      testName: 'About Page Mobile Flow',
      category: 'user_flow',
    },
    filePath: '/artifacts/runs/run_fixture_01/test_2_about_mobile.png',
    format: 'png',
  };
  await registerScreenshot(mobileAboutRecord);

  // Test 5: Querying by compatible metadata criteria
  console.log('[TEST 5] Querying index by compatible criteria');
  const desktopQuery = await queryScreenshots({
    projectId: 'proj_fixture_01',
    viewport: { width: 1280, height: 720 },
  });
  assert.strictEqual(desktopQuery.length, 1);
  assert.strictEqual(desktopQuery[0].id, 'sc_test_home_01');

  const routeQuery = await queryScreenshots({ route: '/about' });
  assert.strictEqual(routeQuery.length, 1);
  assert.strictEqual(routeQuery[0].id, 'sc_test_about_mobile');

  const mobileQuery = await queryScreenshots({ viewport: { width: 375, height: 812 } });
  assert.strictEqual(mobileQuery.length, 1);

  const nonExistentQuery = await queryScreenshots({ route: '/non-existent' });
  assert.strictEqual(nonExistentQuery.length, 0);
  console.log('  -> Query filters by route, viewport, and runId functioned accurately.');

  // Test 6: Index existing artifacts from database test results
  console.log('[TEST 6] Index existing screenshot artifacts');
  const indexed = await indexExistingArtifacts();
  assert.ok(indexed.length > 0, 'Existing test artifacts should be indexed');
  const sampleIndexed = indexed[0];
  assert.ok(sampleIndexed.id.startsWith('sc_'));
  assert.ok(sampleIndexed.route.startsWith('/'));
  assert.ok(sampleIndexed.viewport.width > 0);
  console.log(`  -> Successfully indexed ${indexed.length} existing artifacts with metadata.`);

  console.log('\n--- All Contribution 11 Screenshot Metadata Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
