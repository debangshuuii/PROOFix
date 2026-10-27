import assert from 'node:assert/strict';
import { generateInlineSliderHtml } from '../src/action/visual-slider-generator.ts';

console.log('Testing Visual Slider HTML Generator...');

const diff = {
  testId: 'diff_cart_view',
  route: '/cart',
  baselineScreenshotUrl: 'https://proofix.dev/artifacts/base_cart.png',
  currentScreenshotUrl: 'https://proofix.dev/artifacts/curr_cart.png',
  diffScreenshotUrl: 'https://proofix.dev/artifacts/diff_cart.png',
  mismatchPixels: 142,
  mismatchPercentage: 1.15,
  passed: false,
};

const html = generateInlineSliderHtml(diff, 'cart_slider');

assert.ok(html.includes('id="cart_slider"'), 'Should contain container id');
assert.ok(html.includes('id="cart_slider_clip"'), 'Should contain clip id for dragging');
assert.ok(html.includes('type="range"'), 'Should contain HTML5 range input slider');
assert.ok(html.includes('https://proofix.dev/artifacts/base_cart.png'), 'Should reference baseline image');
assert.ok(html.includes('https://proofix.dev/artifacts/curr_cart.png'), 'Should reference current image');
assert.ok(html.includes('BASELINE (EXPECTED)'), 'Should label baseline badge');
assert.ok(html.includes('CURRENT (ACTUAL)'), 'Should label current badge');

console.log('✅ Visual Slider HTML Generator tests passed!');
