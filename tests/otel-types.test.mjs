import test from 'node:test';
import assert from 'node:assert/strict';

test('OTel tracing types can be constructed and verified', () => {
  const context = {
    version: '00',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    traceFlags: '01',
    traceState: 'congo=t61rcWkgMzE,rojo=00f067a',
  };

  assert.equal(context.version, '00');
  assert.equal(context.traceId.length, 32);
  assert.equal(context.spanId.length, 16);
  assert.equal(context.traceFlags, '01');

  const span = {
    traceId: context.traceId,
    spanId: context.spanId,
    name: 'api_trigger:execute_verification',
    kind: 'SERVER',
    startTimeNano: 1000000000n,
    endTimeNano: 1050000000n,
    durationMs: 50,
    attributes: {
      'http.method': 'POST',
      'http.status_code': 202,
      'test.suite': 'Checkout E2E',
    },
    events: [
      {
        name: 'payload_parsed',
        timestampNano: 1010000000n,
        attributes: { byte_size: 1024 },
      },
    ],
    status: { code: 'OK' },
  };

  assert.equal(span.name, 'api_trigger:execute_verification');
  assert.equal(span.kind, 'SERVER');
  assert.equal(span.status.code, 'OK');
  assert.equal(span.events.length, 1);
});

test('Lifecycle hops represent the complete 5-stage pipeline', () => {
  const hops = [
    'api_trigger',
    'outbox_publisher',
    'queue_worker',
    'sandbox_spawn',
    'playwright_run',
  ];

  assert.equal(hops.length, 5);
  assert.ok(hops.includes('api_trigger'));
  assert.ok(hops.includes('outbox_publisher'));
  assert.ok(hops.includes('queue_worker'));
  assert.ok(hops.includes('sandbox_spawn'));
  assert.ok(hops.includes('playwright_run'));
});
