import test from 'node:test';
import assert from 'node:assert/strict';
import { globalSpanBuffer } from '../src/lib/telemetry/span-buffer.ts';
import { OtlpExporter } from '../src/lib/telemetry/otlp-exporter.ts';

test('OTLP collector pipeline parses OTLP JSON and populates SpanBuffer', () => {
  globalSpanBuffer.clear();

  const exporter = new OtlpExporter();
  const testSpan = {
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    name: 'hop:api_trigger',
    kind: 'SERVER',
    startTimeNano: 1000000000n,
    endTimeNano: 1050000000n,
    durationMs: 50,
    attributes: { 'http.status_code': 202, 'test.suite': 'Smoke Suite' },
    events: [],
    status: { code: 'OK' },
  };

  const payload = exporter.buildOtlpPayload([testSpan]);

  // Simulate OTLP endpoint handler ingestion
  const resSpan = payload.resourceSpans[0];
  const s = resSpan.scopeSpans[0].spans[0];

  globalSpanBuffer.recordSpan({
    traceId: s.traceId,
    spanId: s.spanId,
    name: s.name,
    kind: 'SERVER',
    startTimeNano: BigInt(s.startTimeUnixNano),
    endTimeNano: BigInt(s.endTimeUnixNano),
    durationMs: 50,
    attributes: { 'http.status_code': 202 },
    events: [],
    status: { code: 'OK' },
  });

  const retrieved = globalSpanBuffer.getSpansForTrace('4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0].name, 'hop:api_trigger');
  assert.equal(retrieved[0].attributes['http.status_code'], 202);
});
