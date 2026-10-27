import assert from 'node:assert/strict';
import { evaluateCheckRunGate } from '../src/action/check-run-gatekeeper.ts';

console.log('Testing Check Run Gatekeeper Hydration Blocking...');

// Test 1: Hydration violation when failOnHydrationDrift is active (default)
const failedGate = evaluateCheckRunGate({
  failOnHydrationDrift: true,
  failOnBrokenRoutes: false,
  hydrationDrifts: [
    {
      route: '/checkout',
      component: 'CheckoutButton',
      errorMessage: 'Hydration failed invariant 418',
      timestamp: new Date().toISOString(),
    },
  ],
  brokenRoutes: [],
});

assert.equal(failedGate.passed, false, 'Should fail gate when hydration drift detected');
assert.equal(failedGate.conclusion, 'failure');
assert.ok(failedGate.title.includes('PROOFix Gate Rejected'));
assert.equal(failedGate.hydrationCount, 1);
assert.equal(failedGate.annotations.length, 1);
assert.equal(failedGate.annotations[0].annotation_level, 'failure');
assert.ok(failedGate.annotations[0].title.includes('Hydration Drift'));

// Test 2: Passing when no hydration drifts exist
const passedGate = evaluateCheckRunGate({
  failOnHydrationDrift: true,
  hydrationDrifts: [],
  brokenRoutes: [],
});

assert.equal(passedGate.passed, true);
assert.equal(passedGate.conclusion, 'success');
assert.equal(passedGate.annotations.length, 0);

console.log('✅ Check Run Gatekeeper Hydration Blocking tests passed!');
