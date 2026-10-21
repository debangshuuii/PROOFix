import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OtlpExporter,
  globalOtlpExporter,
} from '../src/lib/telemetry/otlp-exporter.ts';

test('OtlpExporter builds valid OTLP JSON payload with resource and scope spans', () => {
  const exporter = new OtlpExporter({
    serviceName: 'proofix-e2e',
    exportTarget: 'jaeger',
  });

  const span = {
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    name: 'api_trigger:start_run',
    kind: 'SERVER',
    startTimeNano: 1000000000n,
    endTimeNano: 1050000000n,
    durationMs: 50,
    attributes: {
      'http.status_code': 202,
      'test.suite': 'Checkout',
      'user.authorized': true,
    },
    events: [
      {
        name: 'token_verified',
        timestampNano: 1010000000n,
        attributes: { role: 'admin' },
      },
    ],
    status: { code: 'OK' },
  };

  const payload = exporter.buildOtlpPayload([span]);

  assert.equal(payload.resourceSpans.length, 1);
  const resource = payload.resourceSpans[0].resource;
  assert.ok(resource.attributes.some((a) => a.key === 'service.name' && a.value.stringValue === 'proofix-e2e'));

  const scopeSpans = payload.resourceSpans[0].scopeSpans;
  assert.equal(scopeSpans.length, 1);
  assert.equal(scopeSpans[0].scope.name, 'proofix.test.lifecycle');

  const mapped = scopeSpans[0].spans[0];
  assert.equal(mapped.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(mapped.spanId, '00f067aa0ba902b7');
  assert.equal(mapped.kind, 2); // SERVER = 2
  assert.equal(mapped.status.code, 1); // OK = 1
  assert.equal(mapped.events.length, 1);
  assert.equal(mapped.events[0].name, 'token_verified');
});

test('OtlpExporter exports spans successfully and records payloads', async () => {
  const exporter = new OtlpExporter({ exportTarget: 'tempo' });

  const span = {
    traceId: '11223344556677889900aabbccddeeff',
    spanId: 'aabbccddeeff0011',
    name: 'queue_worker:process_job',
    kind: 'CONSUMER',
    startTimeNano: 2000000000n,
    endTimeNano: 2100000000n,
    durationMs: 100,
    attributes: { 'queue.job_id': 'job-101' },
    events: [],
    status: { code: 'OK' },
  };

  const result = await exporter.exportSpans([span]);
  assert.equal(result.success, true);
  assert.equal(result.spanCount, 1);
  assert.equal(result.target, 'tempo');
  assert.equal(exporter.getExportedPayloads().length, 1);
});
