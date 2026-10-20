/**
 * PROOFix Master Semantic Vision-AI CI Regression Test Suite
 * Covering Point 2 / Contributions 111 through 120
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Types & Config (Contributions 111 & 112)
import {
  getDefaultSemanticVisionConfig,
  validateSemanticVisionConfig,
  buildVisionComparisonPrompt,
  SYSTEM_VISION_PROMPT,
} from '../src/lib/vision/vision-config.ts';

// 2. Image Preprocessor (Contribution 113)
import {
  extractPngDimensions,
  prepareVisionImage,
  normalizeBoundingBox,
} from '../src/lib/vision/image-preprocessor.ts';

// 3. Semantic Comparator (Contribution 114)
import {
  calculateColorDistance,
  preFilterVisualDifferences,
} from '../src/lib/vision/semantic-comparator.ts';

// 4. Multimodal Client (Contribution 115)
import { queryMultimodalVision } from '../src/lib/vision/multimodal-client.ts';

// 5. Defect Classifier (Contribution 116)
import {
  extractJsonFromModelOutput,
  classifyVisionDefects,
} from '../src/lib/vision/defect-classifier.ts';

// 6. Layout Shift Explainer (Contribution 117)
import {
  diagnoseLayoutShift,
  aggregateLayoutShiftDiagnoses,
} from '../src/lib/vision/layout-shift-explainer.ts';

// 7. Vision Audit Service Orchestrator (Contribution 118)
import { runSemanticVisionAudit } from '../src/lib/vision/vision-audit-service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log(' PROOFix Master Semantic Vision-AI CI Regression Suite           ');
console.log(' Feature: Vision AI Visual Regression (111–120)                  ');
console.log('================================================================\n');

async function runMasterSemanticVisionSuite() {
  // --------------------------------------------------------------------------
  // Test 1: Types & Configuration Safety Presets (Contributions 111 & 112)
  // --------------------------------------------------------------------------
  console.log('Test 1: Configuration validation, presets, and prompt templates...');
  {
    const defaults = getDefaultSemanticVisionConfig();
    assert.equal(defaults.enabled, false);
    assert.equal(defaults.modelProvider, 'gemini_flash');
    assert.equal(defaults.minConfidenceThreshold, 75);

    const clamped = validateSemanticVisionConfig({
      minConfidenceThreshold: 2,
      maxDefectsPerScreen: 100,
    });
    assert.equal(clamped.config.minConfidenceThreshold, 10);
    assert.equal(clamped.config.maxDefectsPerScreen, 50);

    const prompt = buildVisionComparisonPrompt({
      viewport: { width: 1280, height: 800 },
      routePath: '/checkout',
    });
    assert.ok(prompt.includes('1280x800'));
    assert.ok(prompt.includes('/checkout'));
    assert.ok(SYSTEM_VISION_PROMPT.includes('text_clipping'));
    console.log('  [PASS] Configuration validation and prompt templates verified.');
  }

  // --------------------------------------------------------------------------
  // Test 2: Image Header Parsing & Bounding Box Normalization (Contribution 113)
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Image preprocessor, dimensions, and bounding box normalizer...');
  {
    const pngHeader = Buffer.alloc(32);
    pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    pngHeader.writeUInt32BE(13, 8);
    pngHeader.write('IHDR', 12);
    pngHeader.writeUInt32BE(1440, 16);
    pngHeader.writeUInt32BE(900, 20);

    const dims = extractPngDimensions(pngHeader);
    assert.equal(dims.width, 1440);
    assert.equal(dims.height, 900);

    const prepared = prepareVisionImage(pngHeader);
    assert.ok(prepared.dataUrl.startsWith('data:image/png;base64,'));
    assert.equal(prepared.metadata.width, 1440);

    const box = { x: 50, y: 50, width: 200, height: 100, unit: 'px' };
    const normalizedPercent = normalizeBoundingBox(box, { width: 1000, height: 500 }, 'percent');
    assert.equal(normalizedPercent.x, 5);
    assert.equal(normalizedPercent.y, 10);
    assert.equal(normalizedPercent.width, 20);
    assert.equal(normalizedPercent.height, 20);
    console.log('  [PASS] Image preprocessor and coordinate normalizer verified.');
  }

  // --------------------------------------------------------------------------
  // Test 3: Anti-Aliasing Pre-Filter & Color Distance (Contribution 114)
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Anti-aliasing pre-filter and macroscopic change detection...');
  {
    const dist = calculateColorDistance(100, 100, 100, 110, 100, 100);
    assert.equal(dist, 10);

    const width = 40;
    const height = 40;
    const pixels = width * height * 4;
    const bufA = Buffer.alloc(pixels, 200);
    const bufB = Buffer.alloc(pixels, 200);

    // Subtle edge noise below threshold 16
    bufB[0] = 205;

    const aaResult = preFilterVisualDifferences(bufA, bufB, width, height, { colorDistanceThreshold: 16 });
    assert.equal(aaResult.isPureAntiAliasing, true);
    assert.equal(aaResult.needsVisionAiEvaluation, false);

    // Large visible change
    for (let i = 0; i < 200; i++) {
      bufB[i * 4] = 0;
    }
    const macroResult = preFilterVisualDifferences(bufA, bufB, width, height, { colorDistanceThreshold: 16 });
    assert.equal(macroResult.needsVisionAiEvaluation, true);
    assert.ok(macroResult.filteredDiffPixels >= 100);
    console.log('  [PASS] Subpixel noise suppression and macroscopic regression detection verified.');
  }

  // --------------------------------------------------------------------------
  // Test 4: Multimodal Vision Client & Secret Redaction (Contribution 115)
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Vision client, dual-image payloads, and API key leak protection...');
  {
    const imgA = prepareVisionImage(Buffer.from('baseline-screen'));
    const imgB = prepareVisionImage(Buffer.from('candidate-screen'));

    const mockRes = await queryMultimodalVision({
      baselineImage: imgA,
      candidateImage: imgB,
      prompt: 'Inspect',
      config: { ...getDefaultSemanticVisionConfig(), modelProvider: 'mock' },
    });

    assert.ok(mockRes.rawText.includes('element_overlap'));

    // Test secret leakage prevention on API error
    const leakKey = 'AIzaSySecretLeakTestKey123456';
    const failingFetch = async () => {
      throw new Error(`Failed to authenticate with key: ${leakKey}`);
    };

    await assert.rejects(
      async () => {
        await queryMultimodalVision({
          baselineImage: imgA,
          candidateImage: imgB,
          prompt: 'Inspect',
          config: { ...getDefaultSemanticVisionConfig(), modelProvider: 'gemini_flash' },
          apiKey: leakKey,
          mockFetch: failingFetch,
        });
      },
      (err) => {
        assert.ok(!err.message.includes(leakKey));
        assert.ok(err.message.includes('[REDACTED_API_KEY]') || err.message.includes('[REDACTED_SECRET]'));
        return true;
      }
    );
    console.log('  [PASS] Multimodal client execution and secret leakage defense verified.');
  }

  // --------------------------------------------------------------------------
  // Test 5: Defect Classifier, Markdown Fences, and Scoring (Contribution 116)
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Defect classification, fence parsing, and scoring engine...');
  {
    const modelOutput = `
\`\`\`json
{
  "defects": [
    {
      "category": "navigation_obscuration",
      "severity": "critical",
      "title": "Navigation overlay blocks login button",
      "explanation": "Mobile drawer covers primary CTA",
      "confidenceScore": 96
    },
    {
      "category": "contrast_anomaly",
      "severity": "low",
      "title": "Unreadable subtext",
      "confidenceScore": 50
    }
  ],
  "layoutShifts": [
    {
      "culpritElement": "img.hero",
      "displacementPx": 120,
      "direction": "down",
      "explanation": "Image without dimensions"
    }
  ],
  "overallScore": 70
}
\`\`\`
    `;

    const config = {
      ...getDefaultSemanticVisionConfig(),
      minConfidenceThreshold: 75,
    };

    const classified = classifyVisionDefects(modelOutput, { width: 1280, height: 800 }, config);
    // Low confidence defect (50%) filtered out
    assert.equal(classified.defects.length, 1);
    assert.equal(classified.defects[0].category, 'navigation_obscuration');
    assert.equal(classified.defects[0].severity, 'critical');
    assert.equal(classified.layoutShifts.length, 1);
    assert.equal(classified.hasVisualRegressions, true);
    console.log('  [PASS] Defect classification and scoring engine verified.');
  }

  // --------------------------------------------------------------------------
  // Test 6: Layout Shift DOM Correlation & Remediations (Contribution 117)
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Layout shift explainer, root cause diagnosis, and fix generator...');
  {
    const shift = {
      culpritElement: 'img.product-hero',
      displacementPx: 140,
      direction: 'down',
      explanation: 'Hero image shifted content',
    };

    const diag = diagnoseLayoutShift(shift, [
      {
        selector: 'img.product-hero',
        tagName: 'IMG',
        classes: ['product-hero'],
        attributes: { src: '/img.png' },
      },
    ]);

    assert.equal(diag.probableRootCause, 'missing_media_dimensions');
    assert.equal(diag.displacementPx, 140);
    assert.ok(diag.codeSnippetRemediation?.includes('<img'));

    const agg = aggregateLayoutShiftDiagnoses([diag]);
    assert.equal(agg.totalDisplacementPx, 140);
    assert.equal(agg.exceedsStabilityBudget, true);
    console.log('  [PASS] Layout shift correlation and HTML/CSS remediation verified.');
  }

  // --------------------------------------------------------------------------
  // Test 7: End-to-End Vision Audit Service Orchestration (Contribution 118)
  // --------------------------------------------------------------------------
  console.log('\nTest 7: End-to-end vision audit service orchestration...');
  {
    const bufA = Buffer.alloc(100 * 100 * 4, 255);
    const bufB = Buffer.alloc(100 * 100 * 4, 255);

    // Fast-path bypass on identical images
    const bypassResult = await runSemanticVisionAudit({
      runId: 'run_ci_bypass',
      baselineImage: bufA,
      candidateImage: bufB,
      config: { enabled: true, modelProvider: 'mock' },
    });
    assert.equal(bypassResult.overallScore, 100);
    assert.equal(bypassResult.defects.length, 0);

    // Macroscopic trigger
    for (let i = 0; i < 400; i++) {
      bufB[i * 4] = 0;
    }
    const macroResult = await runSemanticVisionAudit({
      runId: 'run_ci_macro',
      baselineImage: bufA,
      candidateImage: bufB,
      config: { enabled: true, modelProvider: 'mock', minConfidenceThreshold: 70 },
      domContext: [{ selector: 'header.hero', tagName: 'HEADER', classes: ['hero'] }],
    });

    assert.ok(macroResult.defects.length > 0);
    assert.equal(macroResult.hasVisualRegressions, true);
    assert.ok(macroResult.layoutShifts[0].explanation.includes('Fix:'));
    console.log('  [PASS] Vision audit service lifecycle and bypass logic verified.');
  }

  // --------------------------------------------------------------------------
  // Test 8: Semantic Vision UI Component & Page Integration (Contribution 119)
  // --------------------------------------------------------------------------
  console.log('\nTest 8: SemanticVisionReport UI component and Run Page integration...');
  {
    const compPath = path.join(__dirname, '..', 'src', 'components', 'vision', 'SemanticVisionReport.tsx');
    assert.ok(fs.existsSync(compPath), 'SemanticVisionReport.tsx must exist');
    const compCode = fs.readFileSync(compPath, 'utf8');
    assert.ok(compCode.includes('SemanticVisionReport'));
    assert.ok(compCode.includes('Annotated Defect Map'));
    assert.ok(compCode.includes('Golden Master'));

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'projects', '[id]', 'runs', '[runId]', 'page.tsx');
    assert.ok(fs.existsSync(pagePath), 'Run page.tsx must exist');
    const pageCode = fs.readFileSync(pagePath, 'utf8');
    assert.ok(pageCode.includes("import { SemanticVisionReport } from '@/components/vision/SemanticVisionReport'"));
    assert.ok(pageCode.includes("'semantic-vision'"));
    assert.ok(pageCode.includes("<SemanticVisionReport />"));
    console.log('  [PASS] UI component and verification run tab integration verified.');
  }

  // --------------------------------------------------------------------------
  // Test 9: Master CI Script Registration (Contribution 120)
  // --------------------------------------------------------------------------
  console.log('\nTest 9: Package.json script registration...');
  {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.ok(pkgJson.scripts['test:vision'], 'package.json must register "test:vision"');

    const docPath = path.join(__dirname, '..', 'docs', 'SEMANTIC_VISION_AI_REGRESSION.md');
    assert.ok(fs.existsSync(docPath), 'docs/SEMANTIC_VISION_AI_REGRESSION.md must exist');
    console.log('  [PASS] Master CI scripts and architectural documentation verified.');
  }

  console.log('\n================================================================');
  console.log(' [SUCCESS] ALL SEMANTIC VISION-AI REGRESSION SUITES PASSED!    ');
  console.log(' Point 2 (Contributions 111–120) Fully Verified.                ');
  console.log('================================================================');
}

runMasterSemanticVisionSuite().catch((err) => {
  console.error('\n[FAIL] Semantic Vision CI Regression Suite failed:', err);
  process.exit(1);
});
