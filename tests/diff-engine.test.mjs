import assert from 'assert';
import { PNG } from 'pngjs';
import {
  createSyntheticPng,
  generateImageDiff,
} from '../src/lib/comparison/diff-engine.ts';

console.log('--- TEST: Pixel Difference Engine & Controlled Fixtures ---');

async function runTests() {
  const width = 100;
  const height = 100;

  // Test 1: Identical images produce 0 changed pixels
  console.log('[TEST 1] Identical fixture images comparison');
  const identical1 = createSyntheticPng(width, height, [255, 255, 255, 255]);
  const identical2 = createSyntheticPng(width, height, [255, 255, 255, 255]);

  const diff1 = await generateImageDiff(identical1, identical2, { threshold: 0.1 });
  assert.strictEqual(diff1.changedPixels, 0, 'Identical images must yield 0 changed pixels');
  assert.strictEqual(diff1.diffPercentage, 0);
  assert.strictEqual(diff1.totalPixels, 10000);
  console.log('  -> Exactly 0 changed pixels detected on identical images.');

  // Test 2: Controlled fixture with exact 20x25 rectangle modification
  console.log('[TEST 2] Controlled rectangle modification (500 changed pixels)');
  const rectBase = createSyntheticPng(width, height, [255, 255, 255, 255]);
  // 20 px wide by 25 px tall rectangle = exactly 500 pixels changed to red [255, 0, 0, 255]
  const rectModified = createSyntheticPng(width, height, [255, 255, 255, 255], {
    x: 10,
    y: 10,
    w: 20,
    h: 25,
    color: [255, 0, 0, 255],
  });

  const diff2 = await generateImageDiff(rectBase, rectModified, { threshold: 0.1 });
  assert.strictEqual(
    diff2.changedPixels,
    500,
    `Expected exactly 500 changed pixels (20*25), but got ${diff2.changedPixels}`
  );
  assert.strictEqual(diff2.diffPercentage, 5.0, '500 / 10000 should be exactly 5.0%');
  console.log(`  -> Predictable difference output verified: ${diff2.changedPixels} pixels (${diff2.diffPercentage}%).`);

  // Test 3: Output diff image is a valid PNG with correct dimensions
  console.log('[TEST 3] Verify output diff image PNG buffer');
  const parsedDiff = PNG.sync.read(diff2.diffBuffer);
  assert.strictEqual(parsedDiff.width, width);
  assert.strictEqual(parsedDiff.height, height);
  assert.ok(diff2.diffBuffer.length > 0);
  console.log('  -> Output diff buffer successfully parsed as valid PNG.');

  // Test 4: Configurable tolerance threshold
  console.log('[TEST 4] Configurable tolerance threshold test');
  // Create an image with very subtle shade difference (e.g. RGB 255 vs 245)
  const subtleBase = createSyntheticPng(width, height, [255, 255, 255, 255]);
  const subtleDiff = createSyntheticPng(width, height, [255, 255, 255, 255], {
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    color: [248, 248, 248, 255], // very subtle difference
  });

  // Strict threshold (0.01) catches the difference
  const strictDiff = await generateImageDiff(subtleBase, subtleDiff, { threshold: 0.01 });
  assert.strictEqual(strictDiff.changedPixels, 100);

  // Relaxed threshold (0.2) tolerates the subtle difference
  const relaxedDiff = await generateImageDiff(subtleBase, subtleDiff, { threshold: 0.2 });
  assert.strictEqual(relaxedDiff.changedPixels, 0);
  console.log('  -> Configurable threshold verified: strict caught 100 pixels, relaxed tolerated 0 pixels.');

  // Test 5: Rejects mismatched dimensions
  console.log('[TEST 5] Rejects mismatched dimensions');
  const differentDimensions = createSyntheticPng(80, 80, [255, 255, 255, 255]);
  await assert.rejects(
    async () => {
      await generateImageDiff(identical1, differentDimensions);
    },
    /Image dimensions do not match/,
    'Must reject images with mismatched dimensions'
  );
  console.log('  -> Safely rejected comparison of mismatched dimensions.');

  console.log('\n--- All Contribution 14 Diff Engine Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
