import test from 'node:test';
import assert from 'node:assert/strict';
import { SpanBuffer } from '../src/lib/telemetry/span-buffer.ts';

test('SpanBuffer records and indexes spans by traceId', () => {
  const buffer = new SpanBuffer({ maxCapacity: 100 });
  const span = {
    traceId: 'trace-1111',
    spanId: 'span-2222',
    name: 'outbox_publisher',
    kind: 'PRODUCER',
    startTimeNano: 1000000000n,
    durationMs: 4.5,
    attributes: { 'queue.topic': 'verification_runs' },
    events: [],
    status: { code: 'OK' },
  };

  buffer.recordSpan(span);
  assert.equal(buffer.size(), 1);

  const found = buffer.getSpansForTrace('trace-1111');
  assert.equal(found.length, 1);
  assert.equal(found[0].spanId, 'span-2222');
});

test('SpanBuffer tail samples errors even when headSampleRate is low', () => {
  const buffer = new SpanBuffer({
    headSampleRate: 0.0, // Drop all normal traces
    tailSampleErrors: true,
  });

  const normalSpan = {
    traceId: 'trace-good',
    spanId: 'span-1',
    name: 'fast_step',
    kind: 'INTERNAL',
    startTimeNano: 1000n,
    durationMs: 50,
    attributes: {},
    events: [],
    status: { code: 'OK' },
  };

  const errorSpan = {
    traceId: 'trace-error',
    spanId: 'span-2',
    name: 'failing_step',
    kind: 'INTERNAL',
    startTimeNano: 2000n,
    durationMs: 80,
    attributes: {},
    events: [],
    status: { code: 'ERROR', description: 'DB connection refused' },
  };

  buffer.recordSpan(normalSpan);
  buffer.recordSpan(errorSpan);

  assert.equal(buffer.shouldSample('trace-good'), false);
  assert.equal(buffer.shouldSample('trace-error'), true);
});

test('SpanBuffer tail samples slow traces exceeding latency threshold', () => {
  const buffer = new SpanBuffer({
    headSampleRate: 0.0,
    latencyThresholdMs: 2000,
  });

  const slowSpan = {
    traceId: 'trace-slow',
    spanId: 'span-slow',
    name: 'playwright_full_run',
    kind: 'INTERNAL',
    startTimeNano: 1000n,
    durationMs: 3500, // > 2000ms
    attributes: {},
    events: [],
    status: { code: 'OK' },
  };

  buffer.recordSpan(slowSpan);
  assert.equal(buffer.shouldSample('trace-slow'), true);
});

test('SpanBuffer enforces maxCapacity boundary via ring buffer eviction', () => {
  const buffer = new SpanBuffer({ maxCapacity: 3 });

  for (let i = 0; i < 5; i++) {
    buffer.recordSpan({
      traceId: `trace-${i}`,
      spanId: `span-${i}`,
      name: `step-${i}`,
      kind: 'INTERNAL',
      startTimeNano: 1000n,
      durationMs: 10,
      attributes: {},
      events: [],
      status: { code: 'OK' },
    });
  }

  assert.equal(buffer.size(), 3);
  const flushed = buffer.flush();
  assert.equal(flushed.length, 3);
  assert.equal(flushed[0].traceId, 'trace-2'); // 0 and 1 were evicted
});
