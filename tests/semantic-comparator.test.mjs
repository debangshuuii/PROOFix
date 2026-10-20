import assert from 'node:assert/strict';
import {
  calculateColorDistance,
  preFilterVisualDifferences,
} from '../src/lib/vision/semantic-comparator.ts';

console.log('--- Testing Semantic Visual Pre-Filter & Anti-Aliasing Filter (Contribution 114) ---');

function testColorDistance() {
  const distZero = calculateColorDistance(100, 150, 200, 100, 150, 200);
  assert.equal(distZero, 0);

  // Subtle shift (e.g. RGB 100,100,100 vs 105,103,102) -> sqrt(25 + 9 + 4) = sqrt(38) ≈ 6.16
  const subtleDist = calculateColorDistance(100, 100, 100, 105, 103, 102);
  assert.ok(subtleDist > 6 && subtleDist < 7);

  // Major color inversion
  const majorDist = calculateColorDistance(255, 255, 255, 0, 0, 0);
  assert.ok(majorDist > 440);
  console.log('[PASS] Color distance calculator accurately evaluates Euclidean RGB color deltas.');
}

function testIdenticalImages() {
  const width = 100;
  const height = 100;
  const pixels = width * height * 4;
  const bufA = Buffer.alloc(pixels, 255);
  const bufB = Buffer.alloc(pixels, 255);

  const res = preFilterVisualDifferences(bufA, bufB, width, height);
  assert.equal(res.needsVisionAiEvaluation, false);
  assert.equal(res.rawDiffPixels, 0);
  assert.equal(res.filteredDiffPixels, 0);
  assert.equal(res.estimatedSeverity, 'none');
  assert.ok(res.reason.includes('visually identical'));
  console.log('[PASS] Identical images bypass vision model evaluation with zero diffs.');
}

function testSubpixelAntiAliasingFilter() {
  const width = 50;
  const height = 50;
  const pixels = width * height * 4;
  const bufA = Buffer.alloc(pixels, 200);
  const bufB = Buffer.alloc(pixels, 200);

  // Simulate 10 font edge pixels with subtle anti-aliasing variations (color delta = 5 < threshold 16)
  for (let i = 0; i < 10; i++) {
    bufB[i * 4] = 205;     // +5 R
    bufB[i * 4 + 1] = 202; // +2 G
  }

  const res = preFilterVisualDifferences(bufA, bufB, width, height, { colorDistanceThreshold: 16 });
  assert.equal(res.rawDiffPixels, 10);
  assert.equal(res.filteredDiffPixels, 0, 'Subpixel diffs below 16 delta must be filtered out');
  assert.equal(res.isPureAntiAliasing, true);
  assert.equal(res.needsVisionAiEvaluation, false);
  assert.ok(res.reason.includes('harmless font/rendering anti-aliasing'));
  console.log('[PASS] Anti-aliasing filter successfully suppresses false-positive font rendering noise.');
}

function testMacroscopicRegressionTrigger() {
  const width = 100;
  const height = 100;
  const pixels = width * height * 4;
  const bufA = Buffer.alloc(pixels, 255); // White screen
  const bufB = Buffer.alloc(pixels, 255);

  // Introduce a 500-pixel red banner (macroscopic UI mutation)
  for (let i = 0; i < 500; i++) {
    bufB[i * 4] = 255;   // R
    bufB[i * 4 + 1] = 0; // G
    bufB[i * 4 + 2] = 0; // B
  }

  const res = preFilterVisualDifferences(bufA, bufB, width, height);
  assert.equal(res.filteredDiffPixels, 500);
  assert.equal(res.needsVisionAiEvaluation, true);
  assert.ok(res.macroscopicDiffRatio >= 0.05);
  assert.ok(res.estimatedSeverity === 'moderate' || res.estimatedSeverity === 'high');
  console.log('[PASS] Macroscopic structural differences correctly trigger vision AI evaluation.');
}

testColorDistance();
testIdenticalImages();
testSubpixelAntiAliasingFilter();
testMacroscopicRegressionTrigger();
console.log('\nAll Contribution 114 tests passed cleanly!');
