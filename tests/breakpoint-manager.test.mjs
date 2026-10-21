import assert from 'node:assert/strict';
import { BreakpointManager } from '../src/lib/companion/breakpoint-manager.ts';

console.log('--- Testing Companion Breakpoint Manager & Trigger Evaluator (Contribution 123) ---');

function testStepIndexBreakpoint() {
  const manager = new BreakpointManager();
  manager.addBreakpoint({
    stepIndex: 3,
    actionType: 'click',
    condition: 'always',
    enabled: true,
  });

  // Step 2 should not trigger
  const res2 = manager.evaluate({ stepIndex: 2, actionType: 'navigate' });
  assert.equal(res2.shouldPause, false);

  // Step 3 should trigger
  const res3 = manager.evaluate({ stepIndex: 3, actionType: 'click' });
  assert.equal(res3.shouldPause, true);
  assert.ok(res3.reason.includes('step #3'));
  console.log('[PASS] Step index breakpoint pauses at the specified step number.');
}

function testFailureBreakpoint() {
  const manager = new BreakpointManager();
  manager.addBreakpoint({
    condition: 'on_failure',
    enabled: true,
  });

  // Normal successful step
  const okStep = manager.evaluate({
    stepIndex: 1,
    actionType: 'click',
    errorOccurred: false,
  });
  assert.equal(okStep.shouldPause, false);

  // Failed step
  const failedStep = manager.evaluate({
    stepIndex: 2,
    actionType: 'click',
    errorOccurred: true,
    errorMessage: 'Timeout: Button not found',
  });
  assert.equal(failedStep.shouldPause, true);
  assert.ok(failedStep.reason.includes('Timeout: Button not found'));
  console.log('[PASS] "on_failure" conditional breakpoint catches exceptions immediately.');
}

function testUrlPatternBreakpoint() {
  const manager = new BreakpointManager();
  manager.addBreakpoint({
    condition: 'url_match',
    targetPattern: '/checkout/payment',
    enabled: true,
  });

  const cartUrl = manager.evaluate({
    stepIndex: 4,
    actionType: 'navigate',
    currentUrl: 'https://shop.dev/cart',
  });
  assert.equal(cartUrl.shouldPause, false);

  const checkoutUrl = manager.evaluate({
    stepIndex: 5,
    actionType: 'navigate',
    currentUrl: 'https://shop.dev/checkout/payment?token=123',
  });
  assert.equal(checkoutUrl.shouldPause, true);
  assert.ok(checkoutUrl.reason.includes('/checkout/payment'));
  console.log('[PASS] URL match breakpoint triggers when navigating to matching routes.');
}

function testToggleAndClear() {
  const manager = new BreakpointManager();
  const bp = manager.addBreakpoint({ stepIndex: 1, enabled: true });

  assert.equal(manager.evaluate({ stepIndex: 1, actionType: 'click' }).shouldPause, true);

  // Disable breakpoint
  manager.toggleBreakpoint(bp.id, false);
  assert.equal(manager.evaluate({ stepIndex: 1, actionType: 'click' }).shouldPause, false);

  // Re-enable
  manager.toggleBreakpoint(bp.id, true);
  assert.equal(manager.evaluate({ stepIndex: 1, actionType: 'click' }).shouldPause, true);

  // Clear
  manager.clear();
  assert.equal(manager.getBreakpoints().length, 0);
  assert.equal(manager.evaluate({ stepIndex: 1, actionType: 'click' }).shouldPause, false);
  console.log('[PASS] Breakpoint toggle, removal, and clear operations verified.');
}

testStepIndexBreakpoint();
testFailureBreakpoint();
testUrlPatternBreakpoint();
testToggleAndClear();
console.log('\nAll Contribution 123 tests passed cleanly!');
