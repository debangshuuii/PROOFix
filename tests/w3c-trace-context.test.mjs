import test from 'node:test';
import assert from 'node:assert/strict';
import {
  W3CTraceContextHandler,
  globalTraceContextHandler,
} from '../src/lib/telemetry/w3c-trace-context.ts';

test('parseTraceParent correctly decodes valid W3C traceparent headers', () => {
  const header = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const ctx = globalTraceContextHandler.parseTraceParent(header);

  assert.ok(ctx);
  assert.equal(ctx.version, '00');
  assert.equal(ctx.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(ctx.spanId, '00f067aa0ba902b7');
  assert.equal(ctx.traceFlags, '01');
});

test('parseTraceParent rejects invalid headers per W3C specification', () => {
  // Version ff is invalid
  assert.equal(
    globalTraceContextHandler.parseTraceParent('ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'),
    null
  );

  // All zero trace-id is invalid
  assert.equal(
    globalTraceContextHandler.parseTraceParent('00-00000000000000000000000000000000-00f067aa0ba902b7-01'),
    null
  );

  // All zero span-id is invalid
  assert.equal(
    globalTraceContextHandler.parseTraceParent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01'),
    null
  );

  // Malformed lengths
  assert.equal(globalTraceContextHandler.parseTraceParent('not-a-traceparent'), null);
  assert.equal(globalTraceContextHandler.parseTraceParent(null), null);
});

test('formatTraceParent produces valid W3C header', () => {
  const formatted = globalTraceContextHandler.formatTraceParent({
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    sampled: true,
  });

  assert.equal(formatted, '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');

  const unsampled = globalTraceContextHandler.formatTraceParent({
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    sampled: false,
  });

  assert.equal(unsampled, '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00');
});

test('tracestate parsing and formatting work symmetrically', () => {
  const raw = 'rojo=00f067a,congo=t61rcWkgMzE';
  const parsed = globalTraceContextHandler.parseTraceState(raw);

  assert.equal(parsed['rojo'], '00f067a');
  assert.equal(parsed['congo'], 't61rcWkgMzE');

  const formatted = globalTraceContextHandler.formatTraceState(parsed);
  assert.ok(formatted.includes('rojo=00f067a'));
  assert.ok(formatted.includes('congo=t61rcWkgMzE'));
});

test('createRootContext and createChildContext maintain trace continuity', () => {
  const root = globalTraceContextHandler.createRootContext();
  assert.equal(root.traceId.length, 32);
  assert.equal(root.spanId.length, 16);
  assert.equal(root.traceFlags, '01');

  const child = globalTraceContextHandler.createChildContext(root);
  assert.equal(child.traceId, root.traceId);
  assert.notEqual(child.spanId, root.spanId);
  assert.equal(child.traceFlags, root.traceFlags);
});
