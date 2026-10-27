import assert from 'node:assert/strict';
import { detectBrokenRoutes } from '../src/action/broken-routes-detector.ts';

console.log('Testing Broken Routes (404) Detector...');

// Test 1: Navigation resulting in HTTP 404
const results = [
  {
    testId: 'test_broken_link',
    route: '/broken-route',
    status: 'failed',
    error: 'Navigation failed: HTTP 404 Not Found from parent: /dashboard',
    durationMs: 450,
  },
  {
    testId: 'test_health_route',
    route: '/api/v1/health',
    status: 'passed',
    durationMs: 80,
  },
];

const broken = detectBrokenRoutes(results);
assert.equal(broken.length, 1, 'Should detect 1 broken 404 route');
assert.equal(broken[0].route, '/broken-route');
assert.equal(broken[0].httpStatus, 404);
assert.equal(broken[0].referringPage, '/dashboard');

// Test 2: Clean runs
const cleanBroken = detectBrokenRoutes([
  { testId: 't1', route: '/docs', status: 'passed' },
]);
assert.equal(cleanBroken.length, 0, 'Clean run should find 0 broken routes');

// Test 3: Standalone crawler logs with HTTP 404
const logBroken = detectBrokenRoutes([], [
  '[Crawler] GET /legacy-pricing -> HTTP/1.1 404 Not Found (from: /pricing)',
]);
assert.equal(logBroken.length, 1, 'Should detect broken route from crawler log');
assert.equal(logBroken[0].route, '/legacy-pricing');

console.log('✅ Broken Routes Detector tests passed!');
