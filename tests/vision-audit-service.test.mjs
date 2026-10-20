import assert from 'node:assert/strict';
import { runSemanticVisionAudit } from '../src/lib/vision/vision-audit-service.ts';

console.log('--- Testing Semantic Vision Audit Service Orchestrator (Contribution 118) ---');

async function testIdenticalImagesBypassAi() {
  const dummyBuf = Buffer.alloc(100 * 100 * 4, 255);

  const result = await runSemanticVisionAudit({
    runId: 'run_test_bypass',
    baselineImage: dummyBuf,
    candidateImage: dummyBuf,
    config: {
      enabled: true,
      modelProvider: 'mock',
    },
  });

  assert.equal(result.runId, 'run_test_bypass');
  assert.equal(result.overallScore, 100);
  assert.equal(result.hasVisualRegressions, false);
  assert.equal(result.defects.length, 0);
  console.log('[PASS] Identical images bypass vision API inference and return pristine 100 score.');
}

async function testMacroscopicDiffTriggersVisionInspection() {
  const width = 100;
  const height = 100;
  const pixels = width * height * 4;
  const bufBaseline = Buffer.alloc(pixels, 255); // White
  const bufCandidate = Buffer.alloc(pixels, 255);

  // Paint a 500-pixel red rectangle in candidate
  for (let i = 0; i < 500; i++) {
    bufCandidate[i * 4] = 255;
    bufCandidate[i * 4 + 1] = 0;
    bufCandidate[i * 4 + 2] = 0;
  }

  const result = await runSemanticVisionAudit({
    runId: 'run_test_trigger',
    testId: 'test_checkout_flow',
    baselineImage: bufBaseline,
    candidateImage: bufCandidate,
    config: {
      enabled: true,
      modelProvider: 'mock',
      minConfidenceThreshold: 70,
    },
    domContext: [
      {
        selector: 'header.hero',
        tagName: 'HEADER',
        classes: ['hero'],
      },
    ],
  });

  assert.equal(result.runId, 'run_test_trigger');
  assert.equal(result.testId, 'test_checkout_flow');
  assert.ok(result.defects.length > 0);
  assert.equal(result.defects[0].category, 'element_overlap');
  assert.ok(result.layoutShifts.length > 0);
  assert.ok(result.layoutShifts[0].explanation.includes('Fix:'));
  assert.equal(result.hasVisualRegressions, true);
  console.log('[PASS] Macroscopic differences invoke vision model and enrich layout shift fixes.');
}

async function runSuite() {
  await testIdenticalImagesBypassAi();
  await testMacroscopicDiffTriggersVisionInspection();
  console.log('\nAll Contribution 118 tests passed cleanly!');
}

runSuite();
