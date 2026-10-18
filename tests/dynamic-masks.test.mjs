import assert from 'assert';
import {
  saveProjectMasks,
  getProjectMasks,
  addProjectMask,
  deleteProjectMask,
  validateMaskBounds,
  clearMasksStore,
} from '../src/lib/comparison/mask-manager.ts';
import {
  createSyntheticPng,
  generateImageDiff,
} from '../src/lib/comparison/diff-engine.ts';

console.log('--- TEST: Dynamic Region Masking Engine & Exclusion Persistence ---');

async function runTests() {
  await clearMasksStore();
  const projectId = 'proj_fixture_01';

  // Test 1: Validate mask bounds
  console.log('[TEST 1] Validate mask geometric bounds');
  const invalid1 = validateMaskBounds({ name: '', x: -10, y: 0, width: 50, height: 50 });
  assert.strictEqual(invalid1.valid, false);

  const invalid2 = validateMaskBounds({
    name: 'Overflow',
    x: 80,
    y: 80,
    width: 30,
    height: 30,
    unit: 'percent',
  });
  assert.strictEqual(invalid2.valid, false, '80 + 30 > 100% must be rejected');

  const validMask = validateMaskBounds({
    name: 'Header Clock',
    x: 70,
    y: 5,
    width: 25,
    height: 10,
    unit: 'percent',
  });
  assert.strictEqual(validMask.valid, true);
  console.log('  -> Geometric bounds validation functioning correctly.');

  // Test 2: Add and persist masks in comparison configuration
  console.log('[TEST 2] Add and retrieve masks for project');
  const mask1 = await addProjectMask(projectId, {
    name: 'Global Timestamp Header',
    route: '*',
    x: 70,
    y: 5,
    width: 25,
    height: 10,
    unit: 'percent',
    comment: 'Excludes live clock across all routes',
  });

  const mask2 = await addProjectMask(projectId, {
    name: 'About Page Testimonials Carousel',
    route: '/about',
    x: 10,
    y: 50,
    width: 80,
    height: 25,
    unit: 'percent',
  });

  const allMasks = await getProjectMasks(projectId);
  assert.strictEqual(allMasks.length, 2);

  const aboutMasks = await getProjectMasks(projectId, '/about');
  assert.strictEqual(aboutMasks.length, 2, 'Should match global and /about masks');

  const homeMasks = await getProjectMasks(projectId, '/');
  assert.strictEqual(homeMasks.length, 1, 'Should only match global mask');
  console.log('  -> Mask persistence and route-aware filtering verified.');

  // Test 3: Pixel Difference Exclusion Test
  console.log('[TEST 3] Verify mask exclusion in pixel difference engine');
  const width = 100;
  const height = 100;
  const baseImg = createSyntheticPng(width, height, [255, 255, 255, 255]);

  // Modified image with a 20x20 blue box at (10, 10)
  const modifiedImg = createSyntheticPng(width, height, [255, 255, 255, 255], {
    x: 10,
    y: 10,
    w: 20,
    h: 20,
    color: [0, 100, 255, 255],
  });

  // Step 3a: Without mask -> exactly 400 changed pixels (20*20)
  const unmaskedDiff = await generateImageDiff(baseImg, modifiedImg, { threshold: 0.1 });
  assert.strictEqual(unmaskedDiff.changedPixels, 400);
  console.log('  -> Unmasked diff caught exactly 400 changed pixels.');

  // Step 3b: With mask covering the changed region (10, 10, 20, 20) -> exactly 0 changed pixels!
  const maskRegion = {
    id: 'mask_test_01',
    name: 'Dynamic Box Exclusion',
    x: 10,
    y: 10,
    width: 20,
    height: 20,
    unit: 'px',
  };

  const maskedDiff = await generateImageDiff(baseImg, modifiedImg, {
    threshold: 0.1,
    maskedRegions: [maskRegion],
  });

  assert.strictEqual(
    maskedDiff.changedPixels,
    0,
    `Expected 0 changed pixels with mask active, but got ${maskedDiff.changedPixels}`
  );
  assert.strictEqual(maskedDiff.maskedPixelsExcluded, 400);
  assert.strictEqual(maskedDiff.diffPercentage, 0.0);
  console.log('  -> Masked diff completely neutralized volatile region (0 changed pixels).');

  // Test 4: Delete mask
  console.log('[TEST 4] Delete mask from project configuration');
  const deleted = await deleteProjectMask(projectId, mask2.id);
  assert.strictEqual(deleted, true);
  const remaining = await getProjectMasks(projectId);
  assert.strictEqual(remaining.length, 1);
  console.log('  -> Successfully removed mask.');

  console.log('\n--- All Contribution 19 Dynamic Masks Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
