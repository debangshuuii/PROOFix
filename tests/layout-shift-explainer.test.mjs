import assert from 'node:assert/strict';
import {
  diagnoseLayoutShift,
  aggregateLayoutShiftDiagnoses,
} from '../src/lib/vision/layout-shift-explainer.ts';

console.log('--- Testing Layout Shift Explainer & Diagnostic Engine (Contribution 117) ---');

function testMissingMediaDimensionsDiagnosis() {
  const shift = {
    culpritElement: 'img.hero-banner',
    displacementPx: 120,
    direction: 'down',
    explanation: 'Banner displaced navigation 120px down',
  };

  const domElements = [
    {
      selector: 'img.hero-banner',
      tagName: 'IMG',
      classes: ['hero-banner'],
      attributes: { src: '/assets/banner.png' }, // Missing width & height!
    },
  ];

  const diag = diagnoseLayoutShift(shift, domElements);
  assert.equal(diag.probableRootCause, 'missing_media_dimensions');
  assert.equal(diag.displacementPx, 120);
  assert.equal(diag.direction, 'down');
  assert.ok(diag.explanation.includes('rendered without explicit width and height'));
  assert.ok(diag.recommendedFix.includes('aspect-ratio') || diag.recommendedFix.includes('width and height'));
  assert.ok(diag.codeSnippetRemediation?.includes('<img'));
  assert.ok(diag.impactScore >= 45);
  console.log('[PASS] Missing media dimensions identified with code-level HTML/CSS remediation.');
}

function testDynamicBannerDiagnosis() {
  const shift = {
    culpritElement: 'div.promo-announcement-banner',
    displacementPx: 64,
    direction: 'down',
    explanation: 'Promo banner pushed main header down',
  };

  const diag = diagnoseLayoutShift(shift, []);
  assert.equal(diag.probableRootCause, 'dynamically_injected_content');
  assert.ok(diag.explanation.includes('asynchronously'));
  assert.ok(diag.codeSnippetRemediation?.includes('min-height'));
  console.log('[PASS] Dynamic injection displacement correctly triggers placeholder reservation fix.');
}

function testAggregateDiagnoses() {
  const diag1 = diagnoseLayoutShift({
    culpritElement: 'img.banner',
    displacementPx: 100,
    direction: 'down',
    explanation: 'Image shifted content',
  });
  const diag2 = diagnoseLayoutShift({
    culpritElement: 'h1.title',
    displacementPx: 25,
    direction: 'down',
    explanation: 'Font reflow shift',
  });

  const aggregate = aggregateLayoutShiftDiagnoses([diag1, diag2]);
  assert.equal(aggregate.totalDisplacementPx, 125);
  assert.equal(aggregate.highestSeverityDiagnosis?.culpritElement, 'img.banner');
  assert.equal(aggregate.exceedsStabilityBudget, true, 'Displacement > 80px must flag stability budget breach');
  assert.equal(aggregate.causesBreakdown['missing_media_dimensions'], 1);
  assert.equal(aggregate.causesBreakdown['webfont_swap_fout'], 1);
  console.log('[PASS] Layout shift aggregator tracks cumulative displacements and enforces stability budgets.');
}

testMissingMediaDimensionsDiagnosis();
testDynamicBannerDiagnosis();
testAggregateDiagnoses();
console.log('\nAll Contribution 117 tests passed cleanly!');
