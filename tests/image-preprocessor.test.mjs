import assert from 'node:assert/strict';
import {
  extractPngDimensions,
  prepareVisionImage,
  normalizeBoundingBox,
} from '../src/lib/vision/image-preprocessor.ts';

console.log('--- Testing Semantic Vision Image Preprocessor & Bounding Box Normalizer (Contribution 113) ---');

function testPngDimensionExtraction() {
  // Construct a minimal valid PNG header with IHDR chunk
  // Signature (8 bytes) + Length (4 bytes) + IHDR (4 bytes) + Width (4 bytes) + Height (4 bytes) + BitDepth, etc.
  const buffer = Buffer.alloc(32);
  // PNG Signature
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length 13
  buffer.writeUInt32BE(13, 8);
  // 'IHDR'
  buffer.write('IHDR', 12);
  // Width 1920, Height 1080
  buffer.writeUInt32BE(1920, 16);
  buffer.writeUInt32BE(1080, 20);

  const dimensions = extractPngDimensions(buffer);
  assert.equal(dimensions.width, 1920);
  assert.equal(dimensions.height, 1080);
  console.log('[PASS] PNG binary header parser extracts exact screen dimensions.');
}

function testPrepareVisionImage() {
  const dummyBuffer = Buffer.from('fake-screenshot-pixels');
  const prepared = prepareVisionImage(dummyBuffer);

  assert.equal(prepared.mimeType, 'image/png');
  assert.ok(prepared.dataUrl.startsWith('data:image/png;base64,'));
  assert.equal(prepared.base64Data, dummyBuffer.toString('base64'));
  assert.equal(prepared.metadata.byteSize, dummyBuffer.length);

  // Test data URL parsing
  const dataUrlInput = `data:image/jpeg;base64,${Buffer.from('hello-jpeg').toString('base64')}`;
  const preparedFromUrl = prepareVisionImage(dataUrlInput);
  assert.equal(preparedFromUrl.metadata.format, 'jpeg');
  assert.equal(preparedFromUrl.mimeType, 'image/jpeg');
  console.log('[PASS] Image buffer and data URL preparation format payloads for multimodal vision APIs.');
}

function testBoundingBoxNormalization() {
  const dims = { width: 1000, height: 500 };

  // 1. Clamping within bounds
  const outOfBounds = { x: -20, y: 480, width: 200, height: 100, unit: 'px' };
  const normalized = normalizeBoundingBox(outOfBounds, dims, 'px');
  assert.equal(normalized.x, 0);
  assert.equal(normalized.y, 480);
  assert.equal(normalized.height, 20); // clamped to 500 - 480
  assert.equal(normalized.unit, 'px');

  // 2. Percentage to Pixel translation
  const percentBox = { x: 10, y: 20, width: 50, height: 30, unit: 'percent' };
  const toPx = normalizeBoundingBox(percentBox, dims, 'px');
  assert.equal(toPx.x, 100);
  assert.equal(toPx.y, 100);
  assert.equal(toPx.width, 500);
  assert.equal(toPx.height, 150);

  // 3. Pixel to Percentage translation
  const pxBox = { x: 250, y: 100, width: 500, height: 250, unit: 'px' };
  const toPercent = normalizeBoundingBox(pxBox, dims, 'percent');
  assert.equal(toPercent.x, 25);
  assert.equal(toPercent.y, 20);
  assert.equal(toPercent.width, 50);
  assert.equal(toPercent.height, 50);
  assert.equal(toPercent.unit, 'percent');

  console.log('[PASS] Bounding box normalizer handles coordinate clamping and pixel-percentage translations.');
}

testPngDimensionExtraction();
testPrepareVisionImage();
testBoundingBoxNormalization();
console.log('\nAll Contribution 113 tests passed cleanly!');
