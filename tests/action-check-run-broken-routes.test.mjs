import assert from 'node:assert/strict';
import {
  evaluateCheckRunGate,
  evaluateBrokenRoutesPolicy,
} from '../src/action/check-run-gatekeeper.ts';

console.log('Testing Check Run Gatekeeper 404 Blocking...');

// Test 1: evaluateBrokenRoutesPolicy helper
const policy = evaluateBrokenRoutesPolicy([
  { route: '/missing-page', httpStatus: 404 },
]);
assert.equal(policy.violates, true);
assert.equal(policy.count, 1);
assert.ok(policy.message.includes('Blocked merge'));

const cleanPolicy = evaluateBrokenRoutesPolicy([]);
assert.equal(cleanPolicy.violates, false);
assert.equal(cleanPolicy.count, 0);

// Test 2: Full evaluateCheckRunGate with 404 routes
const gate = evaluateCheckRunGate({
  failOnHydrationDrift: false,
  failOnBrokenRoutes: true,
  hydrationDrifts: [],
  brokenRoutes: [
    {
      route: '/broken-route',
      httpStatus: 404,
      referringPage: '/home',
      durationMs: 300,
    },
  ],
});

assert.equal(gate.passed, false, 'Should fail gate on dead 404 route');
assert.equal(gate.conclusion, 'failure');
assert.equal(gate.brokenRouteCount, 1);
assert.equal(gate.annotations.length, 1);
assert.equal(gate.annotations[0].annotation_level, 'failure');
assert.ok(gate.annotations[0].title.includes('404 Not Found'));

console.log('✅ Check Run Gatekeeper 404 Blocking tests passed!');
