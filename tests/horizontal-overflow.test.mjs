import assert from 'node:assert/strict';
import {
  analyzeFixtureDomOverflow,
  getOverflowEvaluationScript,
  DEFAULT_ALLOWED_OVERFLOW_SELECTORS,
} from '../src/lib/viewport/overflow-detector.ts';

console.log('--- Testing Horizontal Overflow Detection (Contribution 45) ---');

const MOBILE_VIEWPORT_WIDTH = 390;

// Test 1: Fixture with approved horizontal carousel
// Carousels intentionally have inner items wider than mobile viewport
const carouselFixture = {
  tagName: 'div',
  className: 'main-container',
  rect: { width: MOBILE_VIEWPORT_WIDTH, right: MOBILE_VIEWPORT_WIDTH },
  children: [
    {
      tagName: 'section',
      className: 'hero',
      rect: { width: MOBILE_VIEWPORT_WIDTH, right: MOBILE_VIEWPORT_WIDTH },
    },
    {
      tagName: 'div',
      className: 'carousel', // Approved selector
      style: { overflowX: 'scroll' },
      attributes: { 'data-carousel': 'true' },
      rect: { width: MOBILE_VIEWPORT_WIDTH, right: MOBILE_VIEWPORT_WIDTH },
      children: [
        {
          tagName: 'div',
          className: 'carousel-slide-1',
          rect: { width: 300, right: 300 },
        },
        {
          tagName: 'div',
          className: 'carousel-slide-2',
          rect: { width: 300, right: 600 }, // Extends beyond 390px!
        },
        {
          tagName: 'div',
          className: 'carousel-slide-3',
          rect: { width: 300, right: 900 }, // Extends beyond 390px!
        },
      ],
    },
  ],
};

const carouselResult = analyzeFixtureDomOverflow(carouselFixture, MOBILE_VIEWPORT_WIDTH);
assert.equal(
  carouselResult.unexpectedOverflow,
  false,
  'Approved horizontal carousel must NOT be flagged as unexpected overflow'
);
assert.equal(carouselResult.offendingElements.length, 0, 'No offending elements should be reported');
assert.ok(carouselResult.approvedScrollContainers >= 1, 'Carousel container should be recognized');
console.log('[PASS] Approved horizontal carousel exempted without false alarm.');

// Test 2: Fixture with real unexpected unconstrained overflow (e.g. fixed table or wide banner)
const brokenLayoutFixture = {
  tagName: 'div',
  className: 'page-wrapper',
  rect: { width: MOBILE_VIEWPORT_WIDTH, right: MOBILE_VIEWPORT_WIDTH },
  children: [
    {
      tagName: 'div',
      id: 'unresponsive-banner',
      className: 'promo-banner',
      rect: { width: 550, right: 550 }, // 160px overflow!
    },
  ],
};

const brokenResult = analyzeFixtureDomOverflow(brokenLayoutFixture, MOBILE_VIEWPORT_WIDTH);
assert.equal(brokenResult.unexpectedOverflow, true, 'Real overflow must be detected');
assert.equal(brokenResult.offendingElements.length, 1, 'Offending element must be identified');
assert.equal(brokenResult.offendingElements[0].id, 'unresponsive-banner');
assert.equal(brokenResult.offendingElements[0].overflowPx, 160);
console.log(`[PASS] Real horizontal overflow identified (+${brokenResult.offendingElements[0].overflowPx}px on #${brokenResult.offendingElements[0].id}).`);

// Test 3: Custom exception selector configuration
const customWidgetFixture = {
  tagName: 'div',
  rect: { width: MOBILE_VIEWPORT_WIDTH, right: MOBILE_VIEWPORT_WIDTH },
  children: [
    {
      tagName: 'div',
      attributes: { 'data-swipe-strip': 'true' },
      rect: { width: 700, right: 700 },
    },
  ],
};

// Default without custom selector flags it:
const unconfigured = analyzeFixtureDomOverflow(customWidgetFixture, MOBILE_VIEWPORT_WIDTH);
assert.equal(unconfigured.unexpectedOverflow, true);

// Configured with custom selector exempts it:
const configured = analyzeFixtureDomOverflow(customWidgetFixture, MOBILE_VIEWPORT_WIDTH, {
  allowedSelectors: [...DEFAULT_ALLOWED_OVERFLOW_SELECTORS, '[data-swipe-strip]'],
});
assert.equal(configured.unexpectedOverflow, false);
console.log('[PASS] Configurable exception selectors allow custom scrollable regions.');

// Test 4: Browser client evaluation script generation
const script = getOverflowEvaluationScript(['.my-carousel'], 2);
assert.ok(script.includes('.my-carousel'));
assert.ok(script.includes('scrollWidth'));
console.log('[PASS] Browser-side overflow detection evaluation script generated.');

console.log('All Horizontal Overflow Detection tests passed successfully.');
