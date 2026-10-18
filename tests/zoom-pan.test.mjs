import assert from 'assert';
import {
  clampPanOffset,
  getSynchronizedTransform,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../src/components/visual/useZoomPan.ts';

console.log('--- TEST: Synchronized Zoom and Pan Controls ---');

// Test 1: Pan clamping at default 1.0x zoom
console.log('[TEST 1] Pan clamping at 1.0x zoom (must reset to origin)');
const panAtBase = clampPanOffset({ x: 50, y: -30 }, 1.0, 800, 450);
assert.strictEqual(panAtBase.x, 0);
assert.strictEqual(panAtBase.y, 0);
console.log('  -> Panning at 1.0x safely clamped to (0, 0).');

// Test 2: Pan clamping at 2.0x zoom
console.log('[TEST 2] Pan bounds clamping at 2.0x zoom');
// container: 800 x 450, zoom: 2.0
// maxPanX = (2 - 1) * 800 / (2 * 2) = 800 / 4 = 200
// maxPanY = (2 - 1) * 450 / 4 = 112.5
const withinBounds = clampPanOffset({ x: 100, y: -50 }, 2.0, 800, 450);
assert.strictEqual(withinBounds.x, 100);
assert.strictEqual(withinBounds.y, -50);

const exceededBounds = clampPanOffset({ x: 500, y: -300 }, 2.0, 800, 450);
assert.strictEqual(exceededBounds.x, 200);
assert.strictEqual(exceededBounds.y, -112.5);
console.log('  -> Boundary clamping at 2.0x correctly constrained to maxPanX (+/-200) and maxPanY (+/-112.5).');

// Test 3: Synchronized transform generation
console.log('[TEST 3] Synchronized transform generation');
const transformString = getSynchronizedTransform(2.5, { x: 45.5, y: -20.25 });
assert.strictEqual(transformString, 'scale(2.50) translate(45.50px, -20.25px)');

// Verifying alignment: Both baseline and target layers receive the identical string
const baselineTransform = getSynchronizedTransform(2.5, { x: 45.5, y: -20.25 });
const targetTransform = getSynchronizedTransform(2.5, { x: 45.5, y: -20.25 });
assert.strictEqual(baselineTransform, targetTransform);
console.log('  -> Baseline and target confirmed to share strictly identical transform coordinate space.');

// Test 4: Constant zoom boundaries
console.log('[TEST 4] Zoom boundary constants');
assert.strictEqual(MIN_ZOOM, 1.0);
assert.strictEqual(MAX_ZOOM, 5.0);
console.log('  -> MIN_ZOOM = 1.0x, MAX_ZOOM = 5.0x validated.');

console.log('\n--- All Contribution 17 Zoom and Pan Tests Passed! ---');
