import assert from 'node:assert/strict';
import {
  getDefaultSemanticVisionConfig,
  validateSemanticVisionConfig,
  buildVisionComparisonPrompt,
  SYSTEM_VISION_PROMPT,
} from '../src/lib/vision/vision-config.ts';

console.log('--- Testing Semantic Vision-AI Configuration & Safety Presets (Contribution 112) ---');

function testDefaultConfig() {
  const config = getDefaultSemanticVisionConfig();
  assert.equal(config.enabled, false, 'Vision AI must default to disabled to prevent unsolicited token consumption');
  assert.equal(config.modelProvider, 'gemini_flash');
  assert.equal(config.minConfidenceThreshold, 75);
  assert.equal(config.ignoreSubpixelAntiAliasing, true);
  assert.ok(config.allowedDefectCategories.includes('text_clipping'));
  assert.ok(config.allowedDefectCategories.includes('element_overlap'));
  assert.ok(config.allowedDefectCategories.includes('unexpected_layout_shift'));
  console.log('[PASS] Safe default configuration verified with master switch disabled.');
}

function testConfigValidationAndClamping() {
  // Test clamping bounds
  const clamped = validateSemanticVisionConfig({
    minConfidenceThreshold: 5,   // Must clamp to 10
    maxDefectsPerScreen: 999,   // Must clamp to 50
    modelProvider: 'invalid',
  });

  assert.equal(clamped.config.minConfidenceThreshold, 10);
  assert.equal(clamped.config.maxDefectsPerScreen, 50);
  assert.equal(clamped.valid, false);
  assert.ok(clamped.errors.some((e) => e.includes('Invalid modelProvider')));

  // Test custom endpoint validation
  const missingEndpoint = validateSemanticVisionConfig({
    modelProvider: 'custom_endpoint',
  });
  assert.equal(missingEndpoint.valid, false);
  assert.ok(missingEndpoint.errors.some((e) => e.includes('customEndpointUrl is required')));

  // Test valid custom config
  const valid = validateSemanticVisionConfig({
    enabled: true,
    modelProvider: 'gemini_pro',
    minConfidenceThreshold: 85,
    maxDefectsPerScreen: 15,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.config.enabled, true);
  assert.equal(valid.config.modelProvider, 'gemini_pro');
  assert.equal(valid.config.minConfidenceThreshold, 85);
  console.log('[PASS] Validation correctly clamps bounds and rejects invalid provider configurations.');
}

function testPromptBuilder() {
  assert.ok(SYSTEM_VISION_PROMPT.includes('text_clipping'));
  assert.ok(SYSTEM_VISION_PROMPT.includes('element_overlap'));
  assert.ok(SYSTEM_VISION_PROMPT.includes('unexpected_layout_shift'));

  const prompt = buildVisionComparisonPrompt({
    viewport: { width: 1440, height: 900 },
    routePath: '/checkout',
    knownInteractiveTargets: ['button#pay', 'input#cc'],
  });

  assert.ok(prompt.includes('1440x900'));
  assert.ok(prompt.includes('/checkout'));
  assert.ok(prompt.includes('button#pay'));
  assert.ok(prompt.includes('layoutShifts'));
  console.log('[PASS] Vision comparison prompt builder formats structured instructions and schema.');
}

testDefaultConfig();
testConfigValidationAndClamping();
testPromptBuilder();
console.log('\nAll Contribution 112 tests passed cleanly!');
