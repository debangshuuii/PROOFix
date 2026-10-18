import assert from 'assert';
import { calculateSliderPercentage } from '../src/components/visual/VisualDiffSlider.tsx';

console.log('--- TEST: Interactive Before/After Slider Mathematics & Bounds ---');

// Test 1: Midpoint calculation
console.log('[TEST 1] Midpoint position calculation (50%)');
const rect = { left: 100, width: 800 };
const midPointClientX = 100 + 400; // 500
const pctMid = calculateSliderPercentage(midPointClientX, rect);
assert.strictEqual(pctMid, 50.0);
console.log('  -> Exactly 50.0% calculated at center.');

// Test 2: Quarter calculation (25%)
console.log('[TEST 2] Quarter position calculation (25%)');
const quarterClientX = 100 + 200; // 300
const pctQuarter = calculateSliderPercentage(quarterClientX, rect);
assert.strictEqual(pctQuarter, 25.0);
console.log('  -> Exactly 25.0% calculated at quarter point.');

// Test 3: Left boundary clamp (0%)
console.log('[TEST 3] Left boundary clamp to 0%');
const leftOutClientX = 50; // beyond left (rect.left = 100)
const pctLeft = calculateSliderPercentage(leftOutClientX, rect);
assert.strictEqual(pctLeft, 0.0);
console.log('  -> Clamped cleanly to 0% on drag left of container.');

// Test 4: Right boundary clamp (100%)
console.log('[TEST 4] Right boundary clamp to 100%');
const rightOutClientX = 1000; // beyond right (rect.left + rect.width = 900)
const pctRight = calculateSliderPercentage(rightOutClientX, rect);
assert.strictEqual(pctRight, 100.0);
console.log('  -> Clamped cleanly to 100% on drag right of container.');

// Test 5: Mobile viewport narrow container
console.log('[TEST 5] Mobile viewport narrow container (320px width)');
const mobileRect = { left: 20, width: 320 };
const mobileClientX = 20 + 160; // 50%
const pctMobile = calculateSliderPercentage(mobileClientX, mobileRect);
assert.strictEqual(pctMobile, 50.0);
console.log('  -> Mobile 320px container accurately aligned at 50.0%.');

// Test 6: Zero width container fallback
console.log('[TEST 6] Zero width container fallback');
const zeroRect = { left: 0, width: 0 };
const pctZero = calculateSliderPercentage(50, zeroRect);
assert.strictEqual(pctZero, 50);
console.log('  -> Zero-width container safely defaulted to 50%.');

console.log('\n--- All Contribution 15 Visual Slider Tests Passed! ---');
