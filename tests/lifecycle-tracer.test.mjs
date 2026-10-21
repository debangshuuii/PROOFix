import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LifecycleTracer,
  globalLifecycleTracer,
} from '../src/lib/telemetry/lifecycle-tracer.ts';

test('LifecycleTraceSession records all 5 hops and links parentSpanIds', async () => {
  const session = globalLifecycleTracer.startSession('Checkout E2E', {
    commitSha: 'a1b2c3d4e5f6',
  });

  const span1 = session.recordHop('api_trigger', 15, { 'http.status': 202 });
  assert.equal(span1.name, 'hop:api_trigger');
  assert.equal(span1.kind, 'SERVER');
  assert.equal(span1.parentSpanId, undefined);

  const span2 = session.recordHop('outbox_publisher', 10, { 'db.table': 'outbox_events' });
  assert.equal(span2.name, 'hop:outbox_publisher');
  assert.equal(span2.kind, 'PRODUCER');
  assert.equal(span2.parentSpanId, span1.spanId);

  const span3 = session.recordHop('queue_worker', 30, { 'worker.id': 'worker-1' });
  assert.equal(span3.name, 'hop:queue_worker');
  assert.equal(span3.kind, 'CONSUMER');
  assert.equal(span3.parentSpanId, span2.spanId);

  const span4 = session.recordHop('sandbox_spawn', 45, { 'sandbox.pid': 12345 });
  assert.equal(span4.name, 'hop:sandbox_spawn');
  assert.equal(span4.parentSpanId, span3.spanId);

  const span5 = session.recordHop('playwright_run', 120, { 'playwright.tests_count': 5 });
  assert.equal(span5.name, 'hop:playwright_run');
  assert.equal(span5.kind, 'CLIENT');
  assert.equal(span5.parentSpanId, span4.spanId);

  const trace = await session.finalize();
  assert.equal(trace.spans.length, 5);
  assert.equal(trace.hopsCompleted.length, 5);
  assert.equal(trace.totalDurationMs, 220);
  assert.equal(trace.hasErrors, false);
  assert.equal(trace.otlpExported, true);
  assert.equal(trace.commitSha, 'a1b2c3d4e5f6');
});

test('LifecycleTraceSession handles errors in pipeline hops and sets status', async () => {
  const tracer = new LifecycleTracer();
  const session = tracer.startSession('Flaky Suite');

  session.recordHop('api_trigger', 10);
  session.recordHop('outbox_publisher', 5);
  session.recordHop(
    'queue_worker',
    25,
    {},
    new Error('DLQ overflow error: worker crashed')
  );

  const trace = await session.finalize();
  assert.equal(trace.hasErrors, true);
  const errorSpan = trace.spans.find((s) => s.status.code === 'ERROR');
  assert.ok(errorSpan);
  assert.ok(errorSpan.status.description?.includes('DLQ overflow'));
});

test('getTraceParentHeader returns valid W3C header format', () => {
  const session = new LifecycleTracer().startSession('Telemetry Test');
  const header = session.getTraceParentHeader();

  assert.ok(header.startsWith('00-'));
  assert.equal(header.split('-').length, 4);
});
