import assert from 'node:assert/strict';
import { detectHydrationDrifts } from '../src/action/hydration-detector.ts';

console.log('Testing Hydration Drift Detector...');

// Test 1: React 19 Hydration Invariant #418 detection
const resultsWithHydration = [
  {
    testId: 'test_checkout_form',
    route: '/checkout',
    status: 'failed',
    error: 'Error: Hydration failed because the initial UI does not match what was rendered on the server. https://react.dev/errors/418 Server: "Checkout (USD)" Client: "Checkout (EUR)"',
    consoleLogs: ['Warning: Text content does not match server-rendered HTML.'],
  },
  {
    testId: 'test_home_health',
    route: '/',
    status: 'passed',
    consoleLogs: ['Page rendered cleanly.'],
  },
];

const drifts = detectHydrationDrifts(resultsWithHydration);
assert.equal(drifts.length, 1, 'Should detect exactly 1 hydration drift error');
assert.equal(drifts[0].route, '/checkout');
assert.equal(drifts[0].serverValue, 'Checkout (USD)');
assert.equal(drifts[0].clientValue, 'Checkout (EUR)');

// Test 2: Clean runs with no hydration errors
const cleanResults = [
  { testId: 't1', route: '/about', status: 'passed', consoleLogs: [] },
  { testId: 't2', route: '/docs', status: 'passed', consoleLogs: [] },
];
const cleanDrifts = detectHydrationDrifts(cleanResults);
assert.equal(cleanDrifts.length, 0, 'Clean results should produce 0 hydration drifts');

// Test 3: Aggregated logs detection
const logDrifts = detectHydrationDrifts([], [
  '[Next.js SSR] Error: An error occurred during hydration. The server HTML was replaced with client content at <Header>',
]);
assert.equal(logDrifts.length, 1, 'Should detect hydration error from aggregated logs');
assert.equal(logDrifts[0].component, 'Header');

console.log('✅ Hydration Drift Detector tests passed!');
