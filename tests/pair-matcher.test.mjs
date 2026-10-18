import assert from 'assert';
import {
  matchScreenshotPairs,
  checkPairCompatibility,
} from '../src/lib/comparison/pair-matcher.ts';

console.log('--- TEST: Compatible Screenshot Pair Matcher ---');

function createSampleMetadata(overrides = {}) {
  return {
    id: 'sc_sample',
    runId: 'run_sample',
    projectId: 'proj_sample',
    route: '/',
    viewport: { width: 1280, height: 720 },
    browser: 'chromium',
    timestamp: new Date().toISOString(),
    testContext: {
      testName: 'Smoke Test',
      category: 'smoke',
    },
    filePath: '/artifacts/sample.png',
    format: 'png',
    ...overrides,
  };
}

// Test 1: Pairwise compatibility diagnostics
console.log('[TEST 1] Pairwise compatibility checker diagnostics');

const base = createSampleMetadata({ id: 'base_1', route: '/home' });
const targetSame = createSampleMetadata({ id: 'target_1', route: '/home' });
const resSame = checkPairCompatibility(base, targetSame);
assert.strictEqual(resSame.compatible, true);
assert.strictEqual(resSame.status, 'matched');
console.log('  -> Exactly matching pair classified as matched.');

const targetDifferentViewport = createSampleMetadata({
  id: 'target_diff_vp',
  route: '/home',
  viewport: { width: 375, height: 812 },
});
const resVp = checkPairCompatibility(base, targetDifferentViewport);
assert.strictEqual(resVp.compatible, false);
assert.strictEqual(resVp.status, 'incompatible_viewport');
assert.ok(resVp.details.notes.includes('Viewport mismatch'));
console.log('  -> Viewport mismatch diagnosed properly.');

const targetDifferentBrowser = createSampleMetadata({
  id: 'target_diff_br',
  route: '/home',
  browser: 'webkit',
});
const resBr = checkPairCompatibility(base, targetDifferentBrowser);
assert.strictEqual(resBr.compatible, false);
assert.strictEqual(resBr.status, 'incompatible_browser');
assert.ok(resBr.details.notes.includes('Browser rendering mismatch'));
console.log('  -> Browser mismatch diagnosed properly.');

// Test 2: Full sets matching
console.log('[TEST 2] Full sets pairing engine');

const baselineSet = [
  createSampleMetadata({ id: 'b_home', route: '/' }),
  createSampleMetadata({ id: 'b_about', route: '/about' }),
  createSampleMetadata({ id: 'b_contact', route: '/contact' }),
  createSampleMetadata({
    id: 'b_vp_mismatch',
    route: '/dashboard',
    viewport: { width: 1280, height: 720 },
  }),
];

const targetSet = [
  createSampleMetadata({ id: 't_home', route: '/' }), // matches b_home
  createSampleMetadata({ id: 't_about', route: '/about' }), // matches b_about
  // missing contact in target (b_contact should be unmatched_missing_target)
  createSampleMetadata({
    id: 't_vp_mismatch',
    route: '/dashboard',
    viewport: { width: 1920, height: 1080 }, // incompatible viewport
  }),
  createSampleMetadata({ id: 't_pricing_new', route: '/pricing' }), // new route in target (unmatched_missing_baseline)
];

const result = matchScreenshotPairs(baselineSet, targetSet);

assert.strictEqual(result.summary.matchedCount, 2, 'Should match / and /about');
assert.strictEqual(result.summary.incompatibleCount, 1, 'Should find 1 incompatible viewport pair on /dashboard');
assert.strictEqual(result.summary.missingTargetCount, 1, 'Should find missing target for /contact');
assert.strictEqual(result.summary.missingBaselineCount, 1, 'Should find missing baseline for /pricing');

console.log('  -> Pair matching summary:', result.summary);

const matchedHome = result.matchedPairs.find((p) => p.route === '/');
assert.ok(matchedHome);
assert.strictEqual(matchedHome.status, 'matched');

const missingContact = result.unmatchedBaseline.find((p) => p.route === '/contact');
assert.ok(missingContact);
assert.strictEqual(missingContact.status, 'unmatched_missing_target');

const newPricing = result.unmatchedTarget.find((p) => p.route === '/pricing');
assert.ok(newPricing);
assert.strictEqual(newPricing.status, 'unmatched_missing_baseline');

console.log('\n--- All Contribution 13 Pair Matcher Tests Passed! ---');
