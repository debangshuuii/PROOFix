import assert from 'assert';
import { db } from '../src/lib/db/index.ts';
import {
  validateScreenshotMetadata,
  registerScreenshot,
  queryScreenshots,
  clearScreenshotIndex,
} from '../src/lib/comparison/screenshot-indexer.ts';
import {
  setProjectBaseline,
  getActiveProjectBaseline,
  getProjectBaselineHistory,
  clearBaselineStore,
} from '../src/lib/comparison/baseline-manager.ts';
import {
  matchScreenshotPairs,
  checkPairCompatibility,
} from '../src/lib/comparison/pair-matcher.ts';
import {
  createSyntheticPng,
  generateImageDiff,
} from '../src/lib/comparison/diff-engine.ts';
import { calculateSliderPercentage } from '../src/components/visual/VisualDiffSlider.tsx';
import { calculateOverlayOpacity } from '../src/components/visual/ComparisonModeViewer.tsx';
import {
  clampPanOffset,
  getSynchronizedTransform,
} from '../src/components/visual/useZoomPan.ts';
import {
  computeDiffStatistics,
  VISUAL_DIFFERENCE_DISCLAIMER,
} from '../src/lib/comparison/diff-stats.ts';
import {
  saveProjectMasks,
  getProjectMasks,
  addProjectMask,
  clearMasksStore,
} from '../src/lib/comparison/mask-manager.ts';
import {
  approveRunAsBaseline,
  getBaselineAuditTrail,
} from '../src/lib/comparison/baseline-approval.ts';

console.log('===============================================================');
console.log('   PROOFIX CI: FEATURE 2 VISUAL REGRESSION COMPREHENSIVE SUITE ');
console.log('   Covering Contributions 11 through 20 in CI Pipeline         ');
console.log('===============================================================\n');

async function runCI() {
  const projectId = 'proj_fixture_01';
  await clearScreenshotIndex();
  await clearBaselineStore();
  await clearMasksStore();

  // -------------------------------------------------------------------------
  // [11] Screenshot metadata schema and indexing
  // -------------------------------------------------------------------------
  console.log('[CI - 11] Verify Screenshot Metadata Schema & Querying');
  const validMetadata = {
    id: 'sc_ci_baseline_home',
    runId: 'run_fixture_baseline',
    projectId,
    route: '/',
    viewport: { width: 1280, height: 720 },
    browser: 'chromium',
    timestamp: new Date().toISOString(),
    testContext: { testName: 'Root Smoke Check', category: 'smoke' },
    filePath: '/artifacts/baseline_home.png',
    format: 'png',
  };
  const val = validateScreenshotMetadata(validMetadata);
  assert.strictEqual(val.valid, true);
  await registerScreenshot(validMetadata);

  const queried = await queryScreenshots({ projectId, route: '/' });
  assert.strictEqual(queried.length, 1);
  console.log('  [PASS] Contribution 11: Schema validated, indexed and queryable.');

  // -------------------------------------------------------------------------
  // [12] Baseline selection and replacement
  // -------------------------------------------------------------------------
  console.log('\n[CI - 12] Verify Baseline Selection & History');
  const initialBase = await getActiveProjectBaseline(projectId);
  assert.ok(initialBase, 'Initial baseline should resolve');

  const baselineRec = await setProjectBaseline(projectId, 'run_fixture_baseline', {
    setBy: 'CI Automated Pipeline',
    reason: 'Designated initial baseline in CI runner.',
  });
  assert.strictEqual(baselineRec.isActive, true);
  assert.strictEqual(baselineRec.runId, 'run_fixture_baseline');
  console.log('  [PASS] Contribution 12: Baseline successfully selected and active.');

  // -------------------------------------------------------------------------
  // [13] Compatible screenshot pair matching
  // -------------------------------------------------------------------------
  console.log('\n[CI - 13] Verify Compatible Screenshot Pair Matching');
  const targetMetadata = {
    ...validMetadata,
    id: 'sc_ci_target_home',
    runId: 'run_ci_target',
  };
  await registerScreenshot(targetMetadata);

  const pairing = matchScreenshotPairs([validMetadata], [targetMetadata]);
  assert.strictEqual(pairing.summary.matchedCount, 1);
  assert.strictEqual(pairing.matchedPairs[0].status, 'matched');
  assert.strictEqual(pairing.matchedPairs[0].compatibilityDetails.viewportMatch, true);
  console.log('  [PASS] Contribution 13: Compatible pair matching succeeded with explicit status.');

  // -------------------------------------------------------------------------
  // [14] Pixel-difference generation with controlled fixtures
  // -------------------------------------------------------------------------
  console.log('\n[CI - 14] Verify Pixel Difference Engine on Controlled Fixture');
  const img1 = createSyntheticPng(100, 100, [255, 255, 255, 255]);
  const img2 = createSyntheticPng(100, 100, [255, 255, 255, 255], {
    x: 20,
    y: 20,
    w: 15,
    h: 20,
    color: [255, 0, 50, 255],
  });
  // 15 * 20 = 300 changed pixels
  const diff = await generateImageDiff(img1, img2, { threshold: 0.1 });
  assert.strictEqual(diff.changedPixels, 300);
  assert.strictEqual(diff.diffPercentage, 3.0);
  assert.ok(diff.diffBuffer.length > 0);
  console.log('  [PASS] Contribution 14: Difference engine yielded predictable 300px (3.0%) output.');

  // -------------------------------------------------------------------------
  // [15] Visual slider coordinate mathematics and clamping
  // -------------------------------------------------------------------------
  console.log('\n[CI - 15] Verify Visual Regression Slider Mathematics');
  const sliderBounds = { left: 50, width: 600 };
  assert.strictEqual(calculateSliderPercentage(350, sliderBounds), 50.0);
  assert.strictEqual(calculateSliderPercentage(10, sliderBounds), 0.0);
  assert.strictEqual(calculateSliderPercentage(1000, sliderBounds), 100.0);
  console.log('  [PASS] Contribution 15: Draggable slider clamped reliably at 0%, 50%, and 100%.');

  // -------------------------------------------------------------------------
  // [16] Side-by-side and overlay comparison modes
  // -------------------------------------------------------------------------
  console.log('\n[CI - 16] Verify Multi-Mode Inspection & Overlay Blend Formulas');
  const overlay50 = calculateOverlayOpacity(50);
  assert.strictEqual(overlay50.baselineOpacity, 0.5);
  assert.strictEqual(overlay50.targetOpacity, 0.5);
  console.log('  [PASS] Contribution 16: Multi-mode inspection opacity accurately balanced.');

  // -------------------------------------------------------------------------
  // [17] Zoom and pan controls
  // -------------------------------------------------------------------------
  console.log('\n[CI - 17] Verify Zoom & Pan Preserves Alignment');
  const panClamp = clampPanOffset({ x: 300, y: -200 }, 2.0, 800, 400);
  assert.strictEqual(panClamp.x, 200);
  assert.strictEqual(panClamp.y, -100);
  const tf = getSynchronizedTransform(2.0, panClamp);
  assert.strictEqual(tf, 'scale(2.00) translate(200.00px, -100.00px)');
  console.log('  [PASS] Contribution 17: Zoom-pan transforms enforce coordinate lockstep.');

  // -------------------------------------------------------------------------
  // [18] Difference statistics and semantic non-bug labeling
  // -------------------------------------------------------------------------
  console.log('\n[CI - 18] Verify Difference Statistics & Non-Bug Semantic Labeling');
  const stats = computeDiffStatistics(10000, 300, 0.1);
  assert.strictEqual(stats.differencePercentage, 3.0);
  assert.strictEqual(stats.classification, 'minor_visual_difference');
  assert.ok(!stats.label.toLowerCase().includes('bug'));
  assert.ok(stats.disclaimer.includes('visual differences, not confirmed bugs'));
  console.log('  [PASS] Contribution 18: Statistics verified with mandatory non-bug label.');

  // -------------------------------------------------------------------------
  // [19] Dynamic region masking engine
  // -------------------------------------------------------------------------
  console.log('\n[CI - 19] Verify Dynamic Region Masking Exclusion');
  const mask = {
    id: 'mask_ci_01',
    name: 'CI Dynamic Box Exclusion',
    x: 20,
    y: 20,
    width: 15,
    height: 20,
    unit: 'px',
  };
  const maskedDiff = await generateImageDiff(img1, img2, {
    threshold: 0.1,
    maskedRegions: [mask],
  });
  assert.strictEqual(maskedDiff.changedPixels, 0, 'Mask must neutralize the changed box');
  assert.strictEqual(maskedDiff.maskedPixelsExcluded, 300);
  console.log('  [PASS] Contribution 19: Dynamic region mask neutralized 300px volatile area to 0 diff.');

  // -------------------------------------------------------------------------
  // [20] Baseline approval, audit trail and cryptographic sign-off
  // -------------------------------------------------------------------------
  console.log('\n[CI - 20] Verify Baseline Approval & Cryptographic Audit Trail');
  const approval = await approveRunAsBaseline({
    projectId,
    runId: 'run_fixture_baseline',
    approverName: 'Principal QA Architect',
    approverEmail: 'architect.qa@proofix.dev',
    comment: 'Official sign-off for release v1.2.0 visual regression baseline.',
  });

  assert.strictEqual(approval.baseline.isActive, true);
  assert.strictEqual(approval.auditEntry.action, 'approve');
  assert.ok(approval.auditEntry.checksum.length >= 32, 'Checksum must be valid hash');

  const trail = await getBaselineAuditTrail(projectId);
  assert.ok(trail.auditEntries.length > 0);
  console.log(`  [PASS] Contribution 20: Audit trail recorded approval with signature: ${approval.auditEntry.checksum.slice(0, 16)}...`);

  console.log('\n===============================================================');
  console.log('  ALL 10 VISUAL REGRESSION CONTRIBUTIONS (11-20) PASSED IN CI!  ');
  console.log('===============================================================');
}

runCI().catch((err) => {
  console.error('\n[CI FAILURE] Visual regression CI test suite failed:', err);
  process.exit(1);
});
