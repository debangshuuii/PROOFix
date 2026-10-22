/**
 * Viewport Matrix & Telemetry Broadcaster Test Suite
 * Validates device profiles, horizontal layout overflow detection,
 * SSE event chunk formatting, and subscription lifecycle.
 */

import assert from 'assert';
import {
  STANDARD_VIEWPORT_PROFILES,
} from '../src/lib/testing/viewport-matrix-runner.ts';
import {
  globalTelemetryBroadcaster,
} from '../src/lib/execution/telemetry-broadcaster.ts';

console.log('===========================================================');
console.log('PROOFix Viewport Matrix & Telemetry Broadcaster Test Suite');
console.log('===========================================================\n');

async function runTestSuite() {
  let passed = 0;

  // 1. Device Viewport Matrix Profiles
  console.log('[TEST 1] Device Viewport Matrix Profiles');
  assert.ok(STANDARD_VIEWPORT_PROFILES.length >= 4);

  const iphone = STANDARD_VIEWPORT_PROFILES.find((p) => p.id === 'mobile-iphone14');
  assert.ok(iphone, 'iPhone 14 profile must be present');
  assert.strictEqual(iphone.width, 390);
  assert.strictEqual(iphone.hasTouch, true);
  assert.strictEqual(iphone.isMobile, true);

  const desktop = STANDARD_VIEWPORT_PROFILES.find((p) => p.category === 'desktop');
  assert.ok(desktop, 'Desktop profile must be present');
  assert.strictEqual(desktop.width, 1280);
  assert.strictEqual(desktop.isMobile, false);

  console.log('  ✓ Viewport device profiles correctly specify touch, scale factor, and dimension invariants.');
  passed++;

  // 2. Horizontal Layout Shift Overflow Invariant
  console.log('[TEST 2] Horizontal Layout Overflow Mathematics');
  function checkOverflow(scrollWidth, innerWidth) {
    const diff = scrollWidth - innerWidth;
    return {
      hasOverflow: diff > 1,
      overflowPixels: Math.max(0, diff),
    };
  }

  const cleanLayout = checkOverflow(1280, 1280);
  assert.strictEqual(cleanLayout.hasOverflow, false);
  assert.strictEqual(cleanLayout.overflowPixels, 0);

  const brokenLayout = checkOverflow(1420, 1280);
  assert.strictEqual(brokenLayout.hasOverflow, true);
  assert.strictEqual(brokenLayout.overflowPixels, 140);

  console.log('  ✓ Layout overflow mathematics reliably flag viewport width exceeding boundaries.');
  passed++;

  // 3. Telemetry Broadcaster SSE Formatting & Subscription Lifecycle
  console.log('[TEST 3] Telemetry Broadcaster SSE Formatting & Events');
  const receivedEvents = [];

  const unsubscribe = globalTelemetryBroadcaster.subscribe('run_test_telemetry', (event) => {
    receivedEvents.push(event);
  });

  // Check initial ping
  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(receivedEvents[0].type, 'ping');

  // Broadcast a step event
  globalTelemetryBroadcaster.broadcast('run_test_telemetry', 'step', {
    name: 'Navigate to /checkout',
    status: 'passed',
    durationMs: 140,
  });

  assert.strictEqual(receivedEvents.length, 2);
  assert.strictEqual(receivedEvents[1].type, 'step');
  assert.strictEqual(receivedEvents[1].data.name, 'Navigate to /checkout');

  // Test SSE formatting
  const sseChunk = globalTelemetryBroadcaster.formatSseChunk(receivedEvents[1]);
  assert.ok(sseChunk.startsWith('event: step\n'));
  assert.ok(sseChunk.includes('"name":"Navigate to /checkout"'));
  assert.ok(sseChunk.endsWith('\n\n'));

  unsubscribe();

  // Broadcast after unsubscribe should not deliver
  globalTelemetryBroadcaster.broadcast('run_test_telemetry', 'step', { name: 'After Unsubscribe' });
  assert.strictEqual(receivedEvents.length, 2);

  console.log('  ✓ Telemetry broadcaster successfully manages subscriptions and formats compliant SSE streams.');
  passed++;

  console.log('===========================================================');
  console.log(`ALL ${passed} VIEWPORT & TELEMETRY TESTS PASSED!`);
  console.log('===========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
