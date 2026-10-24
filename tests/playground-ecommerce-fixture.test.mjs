import test from 'node:test';
import assert from 'node:assert/strict';
import { ECOMMERCE_CHECKOUT_SCENARIO } from '../src/lib/playground/scenarios/ecommerce-checkout.ts';

test('ECOMMERCE_CHECKOUT_SCENARIO has valid id and category', () => {
  assert.equal(ECOMMERCE_CHECKOUT_SCENARIO.id, 'ecommerce_checkout');
  assert.equal(ECOMMERCE_CHECKOUT_SCENARIO.category, 'functional_e2e');
  assert.equal(ECOMMERCE_CHECKOUT_SCENARIO.fault.severity, 'high');
});

test('ECOMMERCE_CHECKOUT_SCENARIO defines expected 404 failure signature', () => {
  const failure = ECOMMERCE_CHECKOUT_SCENARIO.fault.expectedFailure;
  assert.equal(failure.category, 'interaction');
  assert.equal(failure.httpStatus, 404);
  assert.equal(failure.domSelector, '#place-order-btn');
});

test('ECOMMERCE_CHECKOUT_SCENARIO patch diff generates valid App Router route', () => {
  const patch = ECOMMERCE_CHECKOUT_SCENARIO.fixProposal.patchDiff;
  assert.ok(patch.includes('src/app/api/checkout/route.ts'));
  assert.ok(patch.includes('export async function POST'));
  assert.ok(patch.includes('NextResponse.json'));
});

test('ECOMMERCE_CHECKOUT_SCENARIO preloaded run contains 5 tests with 2 failures', () => {
  const tests = ECOMMERCE_CHECKOUT_SCENARIO.initialTestResults;
  assert.equal(tests.length, 5);
  const failed = tests.filter((t) => t.status === 'failed');
  assert.equal(failed.length, 2);
});
