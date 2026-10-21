import assert from 'node:assert/strict';
import {
  classifyAnomaly,
  generateCurlReproducer,
} from '../src/lib/fuzzing/anomaly-classifier.ts';

console.log('--- Testing Contract Anomaly & Vulnerability Classifier (Contribution 136) ---');

const sampleEndpoint = {
  id: 'ep_users_details',
  path: '/api/v1/users/{id}',
  method: 'GET',
  parameters: [{ in: 'path', name: 'id', required: true, type: 'string' }],
  responses: { '200': { statusCode: '200' }, '404': { statusCode: '404' } },
};

function testStackTraceDetection() {
  const result = {
    id: 'res_1',
    fuzzPayload: {
      id: 'pl_1',
      strategy: 'null_byte_injection',
      endpointId: sampleEndpoint.id,
      value: 'admin\u0000',
      description: 'Null byte probe',
    },
    endpointId: sampleEndpoint.id,
    request: {
      url: 'https://api.test.dev/api/v1/users/admin%00',
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    },
    response: {
      statusCode: 500,
      statusText: 'Internal Server Error',
      headers: {},
      bodySnippet: 'TypeError: Cannot read properties of undefined\n    at Object.getUser (D:\\Coding\\app\\node_modules\\pg\\lib\\client.js:142:15)',
      responseTimeMs: 45,
    },
    timestamp: new Date().toISOString(),
  };

  const anomaly = classifyAnomaly(sampleEndpoint, result);
  assert.ok(anomaly);
  assert.equal(anomaly.severity, 'critical');
  assert.equal(anomaly.category, 'information_disclosure');
  assert.equal(anomaly.cweId, 'CWE-209');
  assert.ok(anomaly.description.includes('stack frames'));
  console.log('[PASS] Stack trace disclosure correctly classified as critical (CWE-209).');
}

function testUnhandled500Error() {
  const result = {
    id: 'res_2',
    fuzzPayload: {
      id: 'pl_2',
      strategy: 'boundary_values',
      endpointId: sampleEndpoint.id,
      value: -1,
      description: 'Negative boundary value',
    },
    endpointId: sampleEndpoint.id,
    request: {
      url: 'https://api.test.dev/api/v1/users/-1',
      method: 'GET',
      headers: {},
    },
    response: {
      statusCode: 500,
      statusText: 'Internal Server Error',
      headers: {},
      bodySnippet: '{"error": "Internal Error"}',
      responseTimeMs: 30,
    },
    timestamp: new Date().toISOString(),
  };

  const anomaly = classifyAnomaly(sampleEndpoint, result);
  assert.ok(anomaly);
  assert.equal(anomaly.severity, 'high');
  assert.equal(anomaly.category, 'unhandled_server_exception');
  assert.equal(anomaly.cweId, 'CWE-754');
  console.log('[PASS] Unhandled 500 server exception detected and categorized.');
}

function testAuthTamperingBypass() {
  const result = {
    id: 'res_3',
    fuzzPayload: {
      id: 'pl_3',
      strategy: 'auth_tampering',
      endpointId: sampleEndpoint.id,
      headers: { Authorization: 'Bearer fake.jwt.forgery' },
      description: 'Tampered JWT signature',
    },
    endpointId: sampleEndpoint.id,
    request: {
      url: 'https://api.test.dev/api/v1/users/42',
      method: 'GET',
      headers: { Authorization: 'Bearer fake.jwt.forgery' },
    },
    response: {
      statusCode: 200,
      statusText: 'OK',
      headers: {},
      bodySnippet: '{"user": {"id": 42, "email": "admin@test.dev"}}',
      responseTimeMs: 25,
    },
    timestamp: new Date().toISOString(),
  };

  const anomaly = classifyAnomaly(sampleEndpoint, result);
  assert.ok(anomaly);
  assert.equal(anomaly.severity, 'critical');
  assert.equal(anomaly.category, 'unauthenticated_leak');
  assert.equal(anomaly.cweId, 'CWE-287');
  console.log('[PASS] Authentication tampering bypass flagged with critical severity (CWE-287).');
}

function testCurlReproducer() {
  const curl = generateCurlReproducer(
    'POST',
    'https://api.test.dev/api/v1/orders',
    { 'Content-Type': 'application/json', 'Authorization': 'Bearer test_key' },
    '{"items": [1, 2]}'
  );

  assert.ok(curl.startsWith('curl -X POST "https://api.test.dev/api/v1/orders"'));
  assert.ok(curl.includes('-H "Content-Type: application/json"'));
  assert.ok(curl.includes('-H "Authorization: Bearer test_key"'));
  assert.ok(curl.includes('-d \'{"items": [1, 2]}\''));
  console.log('[PASS] Exact curl reproduction command generated accurately.');
}

testStackTraceDetection();
testUnhandled500Error();
testAuthTamperingBypass();
testCurlReproducer();

console.log('\nAll Contribution 136 tests passed cleanly!');
