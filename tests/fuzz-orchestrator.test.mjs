import assert from 'node:assert/strict';
import {
  calculateHealthScore,
  runApiFuzzingAudit,
} from '../src/lib/fuzzing/fuzz-orchestrator.ts';

console.log('--- Testing API Fuzzing Audit Orchestrator Service (Contribution 138) ---');

function testHealthScoreCalculation() {
  assert.equal(calculateHealthScore([], 50), 100, 'Zero anomalies must yield 100% health score');

  // 1 critical (-25) + 1 high (-12) = 100 - 37 = 63
  const anomalies = [
    { severity: 'critical' },
    { severity: 'high' },
  ];
  assert.equal(calculateHealthScore(anomalies, 20), 63);

  // Severe anomalies capped at 0
  const severe = [
    { severity: 'critical' },
    { severity: 'critical' },
    { severity: 'critical' },
    { severity: 'critical' },
    { severity: 'critical' },
  ];
  assert.equal(calculateHealthScore(severe, 10), 0);
  console.log('[PASS] Contract health score calculates weighted penalty reductions properly.');
}

async function testFullAuditOrchestration() {
  const sampleSpec = {
    openapi: '3.0.0',
    info: { title: 'Order Service', version: '1.0' },
    paths: {
      '/api/orders/{orderId}': {
        parameters: [{ in: 'path', name: 'orderId', required: true, type: 'string' }],
        get: {
          summary: 'Get order details',
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  };

  // Mock fetch: simulates a 500 error when receiving a null byte in URL
  const mockFetch = async (url) => {
    if (url.includes('%00') || url.includes('\u0000')) {
      return {
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => '{"error": "invalid byte sequence"}',
      };
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: async () => '{"orderId": "101", "status": "pending"}',
    };
  };

  let progressCalled = 0;
  const report = await runApiFuzzingAudit({
    runId: 'run_audit_test_01',
    targetBaseUrl: 'https://orders.test.dev',
    specInput: sampleSpec,
    fetchFn: mockFetch,
    config: {
      maxRequestsPerEndpoint: 15,
      enabledStrategies: ['boundary_values', 'null_byte_injection'],
    },
    onProgress: (p) => {
      progressCalled++;
    },
  });

  assert.equal(report.runId, 'run_audit_test_01');
  assert.equal(report.specTitle, 'Order Service');
  assert.equal(report.endpoints.length, 1);
  assert.ok(report.summary.totalRequestsExecuted > 0);
  assert.ok(progressCalled > 0, 'Progress callback should be invoked');

  // Verify that null byte 500 anomaly was detected!
  assert.ok(report.anomalies.length > 0, 'Should detect at least 1 anomaly from null byte 500');
  const nullAnomaly = report.anomalies.find((a) => a.fuzzStrategy === 'null_byte_injection');
  assert.ok(nullAnomaly, 'Null byte anomaly must be present');
  assert.equal(nullAnomaly.observedResponse.statusCode, 500);
  assert.ok(nullAnomaly.reproducingRequest.curlCommand.includes('curl -X GET'));

  assert.ok(report.summary.contractHealthScore < 100);
  console.log(`[PASS] Full audit orchestration executed ${report.summary.totalRequestsExecuted} fuzz requests and identified ${report.anomalies.length} anomalies (Health Score: ${report.summary.contractHealthScore}%).`);
}

testHealthScoreCalculation();
await testFullAuditOrchestration();

console.log('\nAll Contribution 138 tests passed cleanly!');
