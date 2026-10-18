import assert from 'assert';
import {
  computeDiffStatistics,
  VISUAL_DIFFERENCE_DISCLAIMER,
} from '../src/lib/comparison/diff-stats.ts';

console.log('--- TEST: Visual Difference Statistics & Non-Bug Semantic Labeling ---');

// Test 1: Zero changed pixels (Visual Match)
console.log('[TEST 1] Exactly 0 changed pixels');
const stats0 = computeDiffStatistics(10000, 0, 0.1);
assert.strictEqual(stats0.changedPixels, 0);
assert.strictEqual(stats0.differencePercentage, 0.0);
assert.strictEqual(stats0.classification, 'visual_match');
assert.strictEqual(stats0.label, 'No Visual Change (Visual Match)');
assert.ok(!stats0.label.toLowerCase().includes('bug'), 'Label must not classify visual match as a bug');
console.log('  -> Zero changed pixels labeled as "No Visual Change (Visual Match)".');

// Test 2: Known fixture 500 changed pixels (5.000%)
console.log('[TEST 2] Known fixture 500 changed pixels');
const stats500 = computeDiffStatistics(10000, 500, 0.1);
assert.strictEqual(stats500.changedPixels, 500);
assert.strictEqual(stats500.differencePercentage, 5.0);
assert.strictEqual(stats500.classification, 'minor_visual_difference');
assert.strictEqual(stats500.label, 'Minor Visual Difference (Styling / Anti-aliasing)');
assert.ok(stats500.label.includes('Visual Difference'), 'Must be labeled as Visual Difference');
assert.ok(!stats500.label.toLowerCase().includes('bug'), 'Must NOT be labeled as confirmed bug');
console.log('  -> 500 changed pixels accurately calculated to 5.0% and labeled as "Minor Visual Difference".');

// Test 3: Large visual shift (15.0%)
console.log('[TEST 3] Significant layout shift (15.0%)');
const statsBig = computeDiffStatistics(10000, 1500, 0.1);
assert.strictEqual(statsBig.differencePercentage, 15.0);
assert.strictEqual(statsBig.classification, 'significant_visual_difference');
assert.strictEqual(statsBig.label, 'Significant Visual Difference (Layout / Content Shift)');
assert.ok(!statsBig.label.toLowerCase().includes('bug'));
console.log('  -> 15% shift labeled as "Significant Visual Difference" without bug attribution.');

// Test 4: Masked pixels exclusion in percentage formula
console.log('[TEST 4] Masked pixels excluded from denominator');
// Total 10000, 2000 pixels masked out => effective total 8000. Changed pixels 400.
// 400 / 8000 = 5.0%
const statsMasked = computeDiffStatistics(10000, 400, 0.1, 2000);
assert.strictEqual(statsMasked.totalPixels, 10000);
assert.strictEqual(statsMasked.maskedPixelsExcluded, 2000);
assert.strictEqual(statsMasked.differencePercentage, 5.0);
console.log('  -> Masked exclusions correctly adjusted denominator.');

// Test 5: Strict non-bug disclaimer presence
console.log('[TEST 5] Developer disclaimer validation');
assert.ok(stats0.disclaimer.includes('visual differences, not confirmed bugs'));
assert.strictEqual(stats0.disclaimer, VISUAL_DIFFERENCE_DISCLAIMER);
console.log('  -> Required non-bug developer disclaimer verified across all statistics.');

console.log('\n--- All Contribution 18 Difference Statistics Tests Passed! ---');
