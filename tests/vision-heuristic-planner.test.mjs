import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VisionHeuristicPlanner,
  globalVisionHeuristicPlanner,
} from '../src/lib/crawler/vision-heuristic-planner.ts';

test('planNextAction selects input fuzzing when unvisited inputs exist', () => {
  const planner = new VisionHeuristicPlanner();
  const action = planner.planNextAction({
    currentUrl: 'https://acme.com/search',
    depth: 1,
    maxDepth: 3,
    availableElements: [
      { id: '1', type: 'input', selector: 'input[name="q"]', text: 'Search query' },
      { id: '2', type: 'link', selector: 'a[href="/about"]', text: 'About', href: '/about' },
    ],
    visitedUrls: new Set(['https://acme.com/search']),
    testedSelectorsOnPage: new Set(),
    randomPayloadsEnabled: true,
  });

  assert.equal(action.type, 'fill_random_payload');
  assert.equal(action.selector, 'input[name="q"]');
  assert.ok(action.payload !== undefined);
  assert.ok(action.rationale.includes('Fuzzing'));
});

test('planNextAction selects unvisited link when inputs are already tested', () => {
  const planner = new VisionHeuristicPlanner();
  const action = planner.planNextAction({
    currentUrl: 'https://acme.com/home',
    depth: 0,
    maxDepth: 3,
    availableElements: [
      { id: '1', type: 'input', selector: 'input#search', text: 'Search' },
      { id: '2', type: 'link', selector: 'a[href="/docs"]', text: 'Docs', href: '/docs' },
    ],
    visitedUrls: new Set(['https://acme.com/home']),
    testedSelectorsOnPage: new Set(['input#search']),
    randomPayloadsEnabled: true,
  });

  assert.equal(action.type, 'click');
  assert.equal(action.selector, 'a[href="/docs"]');
  assert.equal(action.targetUrl, '/docs');
});

test('planNextAction falls back to scrolling when all elements on page are exhausted', () => {
  const planner = new VisionHeuristicPlanner();
  const action = planner.planNextAction({
    currentUrl: 'https://acme.com/feed',
    depth: 2,
    maxDepth: 3,
    availableElements: [
      { id: '1', type: 'button', selector: 'button.load-more', text: 'Load More' },
    ],
    visitedUrls: new Set(['https://acme.com/feed']),
    testedSelectorsOnPage: new Set(['button.load-more']),
    randomPayloadsEnabled: false,
  });

  assert.equal(action.type, 'scroll_viewport');
  assert.ok(action.coordinates);
});
