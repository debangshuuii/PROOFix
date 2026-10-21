import assert from 'node:assert/strict';
import {
  TelemetryBroadcaster,
  globalTelemetryBroadcaster,
} from '../src/lib/companion/telemetry-broadcaster.ts';

console.log('--- Testing Telemetry Event Broadcaster & SSE Protocol (Contribution 122) ---');

function testSseFormatting() {
  const event = {
    id: 'evt_test_01',
    runId: 'run_101',
    type: 'state_change',
    timestamp: '2026-10-20T10:00:00.000Z',
    payload: { state: 'paused', stepIndex: 2 },
  };

  const sse = TelemetryBroadcaster.formatSseEvent(event);
  assert.ok(sse.startsWith('id: evt_test_01\n'));
  assert.ok(sse.includes('event: state_change\n'));
  assert.ok(sse.includes('data: {"id":"evt_test_01"'));
  assert.ok(sse.endsWith('\n\n'));
  console.log('[PASS] Server-Sent Events protocol text serialization conforms to specification.');
}

function testChannelSubscriptionAndReplay() {
  const broadcaster = new TelemetryBroadcaster({ historyBufferLimit: 5 });
  const runA = 'run_chan_a';
  const runB = 'run_chan_b';

  // Broadcast event before any subscriber connects
  broadcaster.broadcast(runA, 'console_log', { text: 'Log entry 1' });
  broadcaster.broadcast(runA, 'console_log', { text: 'Log entry 2' });

  // Subscriber connects to runA: should receive history replay!
  const receivedA = [];
  const unsubscribeA = broadcaster.subscribe(runA, (chunk) => {
    receivedA.push(chunk);
  }, true);

  assert.equal(receivedA.length, 2, 'Should immediately receive 2 buffered history events');
  assert.equal(broadcaster.getSubscriberCount(runA), 1);
  assert.equal(broadcaster.getSubscriberCount(runB), 0);

  // New broadcast on runA
  broadcaster.broadcast(runA, 'step_start', { stepIndex: 1, action: 'navigate' });
  assert.equal(receivedA.length, 3);

  // Broadcast on runB should NOT leak into runA subscriber!
  const receivedB = [];
  broadcaster.subscribe(runB, (chunk) => {
    receivedB.push(chunk);
  });
  broadcaster.broadcast(runB, 'console_log', { text: 'Run B log' });

  assert.equal(receivedA.length, 3, 'Run A subscriber must NOT receive Run B messages');
  assert.equal(receivedB.length, 1);

  // Unsubscribe cleanly
  unsubscribeA();
  assert.equal(broadcaster.getSubscriberCount(runA), 0);

  console.log('[PASS] Channel isolation, history buffer replay, and clean unsubscription verified.');
}

function testRingBufferLimit() {
  const broadcaster = new TelemetryBroadcaster({ historyBufferLimit: 3 });
  const runId = 'run_ring';

  for (let i = 1; i <= 6; i++) {
    broadcaster.broadcast(runId, 'console_log', { index: i });
  }

  const history = broadcaster.getEventHistory(runId);
  assert.equal(history.length, 3, 'History buffer must be capped at 3');
  assert.equal(history[0].payload.index, 4);
  assert.equal(history[2].payload.index, 6);

  broadcaster.clearRun(runId);
  assert.equal(broadcaster.getEventHistory(runId).length, 0);
  console.log('[PASS] Ring buffer correctly evicts oldest items to prevent memory bloat.');
}

testSseFormatting();
testChannelSubscriptionAndReplay();
testRingBufferLimit();
console.log('\nAll Contribution 122 tests passed cleanly!');
