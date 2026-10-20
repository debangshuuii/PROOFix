import assert from 'node:assert/strict';
import {
  extractJsonFromModelOutput,
  classifyVisionDefects,
} from '../src/lib/vision/defect-classifier.ts';
import { getDefaultSemanticVisionConfig } from '../src/lib/vision/vision-config.ts';

console.log('--- Testing Semantic Vision Defect Classifier & Response Parser (Contribution 116) ---');

function testJsonExtractionFromFences() {
  const markdownSample = `
Here is my visual audit of the candidate screenshot:

\`\`\`json
{
  "defects": [
    {
      "category": "text_clipping",
      "severity": "high",
      "title": "Header text clipped by container",
      "confidenceScore": 92
    }
  ],
  "layoutShifts": []
}
\`\`\`

Let me know if you need further clarifications.
  `;

  const extracted = extractJsonFromModelOutput(markdownSample);
  const parsed = JSON.parse(extracted);
  assert.equal(parsed.defects.length, 1);
  assert.equal(parsed.defects[0].category, 'text_clipping');
  console.log('[PASS] Markdown code fence stripper correctly extracts nested JSON.');
}

function testDefectClassificationAndThresholdFiltering() {
  const modelOutput = JSON.stringify({
    defects: [
      {
        category: 'element_overlap',
        severity: 'critical',
        title: 'Checkout button obscured',
        explanation: 'Modal backdrop obscures checkout action',
        boundingBox: { x: 50, y: 100, width: 200, height: 60, unit: 'px' },
        confidenceScore: 95,
        suggestedRemediation: 'Check z-index ordering',
      },
      {
        category: 'contrast_anomaly',
        severity: 'low',
        title: 'Low contrast subtext',
        explanation: 'Subtle gray text on white background',
        confidenceScore: 60, // Below default threshold 75!
      },
    ],
    layoutShifts: [
      {
        culpritElement: 'img.banner',
        displacementPx: 120,
        direction: 'down',
        explanation: 'Image banner missing dimensions displaced content 120px down.',
      },
    ],
  });

  const config = {
    ...getDefaultSemanticVisionConfig(),
    minConfidenceThreshold: 75,
  };

  const result = classifyVisionDefects(modelOutput, { width: 1280, height: 800 }, config);

  // 1. Defect confidence threshold check: low-confidence defect (60%) must be rejected
  assert.equal(result.defects.length, 1);
  assert.equal(result.defects[0].category, 'element_overlap');
  assert.equal(result.defects[0].severity, 'critical');
  assert.equal(result.defects[0].confidenceScore, 95);

  // 2. Layout shift checks
  assert.equal(result.layoutShifts.length, 1);
  assert.equal(result.layoutShifts[0].displacementPx, 120);
  assert.equal(result.layoutShifts[0].direction, 'down');

  // 3. Regressions and score penalties
  assert.equal(result.hasVisualRegressions, true);
  // Score: 100 - 30 (critical defect) - 15 (layout shift > 100px) = 55
  assert.equal(result.overallScore, 55);
  console.log('[PASS] Classifier normalizes categories, filters confidence thresholds, and computes accurate health scores.');
}

function testMalformedModelOutputFallback() {
  const malformed = 'Sorry, as an AI I could not process your images due to internal error.';
  const config = getDefaultSemanticVisionConfig();

  const result = classifyVisionDefects(malformed, { width: 1000, height: 800 }, config);
  assert.equal(result.defects.length, 0);
  assert.ok(result.parseErrors.length > 0);
  assert.equal(result.hasVisualRegressions, true);
  console.log('[PASS] Graceful error fallback activates on malformed model text.');
}

testJsonExtractionFromFences();
testDefectClassificationAndThresholdFiltering();
testMalformedModelOutputFallback();
console.log('\nAll Contribution 116 tests passed cleanly!');
