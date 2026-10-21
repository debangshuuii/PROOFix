import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SpanTracer,
  ActiveSpan,
} from '../src/lib/telemetry/span-tracer.ts';

test('ActiveSpan tracks duration and tags accurately', async () => {
  const span = new ActiveSpan(
    '4bf92f3577b34da6a3ce929d0e0e4736',
    '00f067aa0ba902b7',
    'database_query',
    'CLIENT',
    undefined,
    { 'db.system': 'postgresql' }
  );

  span.setAttribute('db.statement', 'SELECT * FROM audit_ledger');
  span.addEvent('connection_acquired');

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 20));

  const finished = span.end();
  assert.equal(finished.name, 'database_query');
  assert.equal(finished.kind, 'CLIENT');
  assert.equal(finished.attributes['db.system'], 'postgresql');
  assert.equal(finished.attributes['db.statement'], 'SELECT * FROM audit_ledger');
  assert.equal(finished.status.code, 'OK');
  assert.ok(finished.durationMs && finished.durationMs >= 15);
  assert.equal(finished.events.length, 1);
  assert.equal(finished.events[0].name, 'connection_acquired');
});

test('recordException logs exception event and marks span as ERROR', () => {
  const span = new ActiveSpan(
    '4bf92f3577b34da6a3ce929d0e0e4736',
    '1122334455667788',
    'failing_step'
  );

  const error = new Error('Assertion failed: timeout after 5000ms');
  span.recordException(error);

  const finished = span.end();
  assert.equal(finished.status.code, 'ERROR');
  assert.equal(finished.status.description, 'Assertion failed: timeout after 5000ms');
  assert.equal(finished.events.length, 1);
  assert.equal(finished.events[0].name, 'exception');
  assert.equal(finished.events[0].attributes?.['exception.message'], 'Assertion failed: timeout after 5000ms');
});

test('SpanTracer.traceExecution wraps operations and captures spans', async () => {
  const tracer = new SpanTracer();

  const { result, span } = await tracer.traceExecution(
    'playwright_action',
    async (s) => {
      s.setAttribute('playwright.selector', 'button#submit');
      return { clicked: true };
    }
  );

  assert.equal(result.clicked, true);
  assert.equal(span.name, 'playwright_action');
  assert.equal(span.status.code, 'OK');
  assert.equal(tracer.getCompletedSpans().length, 1);
});
