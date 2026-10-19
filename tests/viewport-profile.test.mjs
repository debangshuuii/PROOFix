import assert from 'node:assert/strict';
import { validateViewportProfile, assertValidViewportProfile } from '../src/lib/viewport/profile-schema.ts';

console.log('--- Testing Viewport Profile Schema (Contribution 41) ---');

// 1. Valid profile accepted
const validDesktop = {
  id: 'desktop-1440x900',
  name: 'Desktop Standard',
  category: 'desktop',
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  hasTouch: false,
  isMobile: false,
};

const res1 = validateViewportProfile(validDesktop);
assert.equal(res1.valid, true, 'Valid profile must be accepted');
assert.equal(res1.errors.length, 0);
assert.equal(res1.profile?.width, 1440);
assert.equal(res1.profile?.height, 900);
assert.equal(res1.profile?.isLandscape, true);
assert.ok(res1.profile?.disclaimer.includes('Viewport Preset'));
console.log('[PASS] Valid profile accepted with defaults and disclaimer.');

// 2. Reject negative or zero dimensions
const zeroWidth = { id: 'bad-zero', name: 'Zero Width', width: 0, height: 800 };
const resZero = validateViewportProfile(zeroWidth);
assert.equal(resZero.valid, false, 'Zero width must be rejected');
assert.ok(resZero.errors.some(e => e.includes('between 240px and 7680px')));

const negativeHeight = { id: 'bad-neg', name: 'Negative Height', width: 1024, height: -500 };
const resNeg = validateViewportProfile(negativeHeight);
assert.equal(resNeg.valid, false, 'Negative height must be rejected');
assert.ok(resNeg.errors.some(e => e.includes('between 240px and 4320px')));
console.log('[PASS] Zero and negative dimensions rejected.');

// 3. Reject non-integer dimensions
const decimalDim = { id: 'bad-decimal', name: 'Decimal Width', width: 1024.5, height: 768 };
const resDec = validateViewportProfile(decimalDim);
assert.equal(resDec.valid, false, 'Float width must be rejected');
assert.ok(resDec.errors.some(e => e.includes('must be an integer')));
console.log('[PASS] Non-integer float dimensions rejected.');

// 4. Reject out-of-bounds dimensions (e.g. width < 240 or > 7680)
const tooSmall = { id: 'too-small', name: 'Too Narrow', width: 120, height: 500 };
assert.equal(validateViewportProfile(tooSmall).valid, false);

const tooHuge = { id: 'too-huge', name: 'Beyond 8K', width: 12000, height: 2000 };
assert.equal(validateViewportProfile(tooHuge).valid, false);
console.log('[PASS] Out of bounds dimensions rejected.');

// 5. Reject invalid deviceScaleFactor
const badScale = { id: 'bad-scale', name: 'Bad Scale', width: 1280, height: 720, deviceScaleFactor: 10.0 };
const resScale = validateViewportProfile(badScale);
assert.equal(resScale.valid, false, 'Extreme scale factor rejected');
console.log('[PASS] Invalid deviceScaleFactor rejected.');

// 6. assertValidViewportProfile throws on invalid
assert.throws(() => {
  assertValidViewportProfile({ id: 'bad', name: 'Missing Dimensions' });
}, /Invalid ViewportProfile/);
console.log('[PASS] assertValidViewportProfile throws appropriately on invalid profile.');

console.log('All Viewport Profile Schema tests passed successfully.');
