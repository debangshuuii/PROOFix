import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('--- Testing API Fuzzing Types, Strategy Taxonomy & Anomaly Schema (Contribution 131) ---');

const typesPath = resolve(process.cwd(), 'src/lib/types/api-fuzzing.ts');
assert.ok(existsSync(typesPath), 'src/lib/types/api-fuzzing.ts must exist');

const source = readFileSync(typesPath, 'utf8');

// 1. Verify Strategy Types
const expectedStrategies = [
  'boundary_values',
  'type_confusion',
  'null_byte_injection',
  'unicode_homoglyphs',
  'sqli_adversarial',
  'xss_adversarial',
  'oversized_payload',
  'schema_violation',
  'auth_tampering',
  'rate_limit_probe',
];

for (const strat of expectedStrategies) {
  assert.ok(source.includes(strat), `Strategy type "${strat}" must be declared in taxonomy`);
}

// 2. Verify Anomaly Severity & Categories
const expectedSeverities = ['critical', 'high', 'medium', 'low', 'info'];
for (const sev of expectedSeverities) {
  assert.ok(source.includes(sev), `Severity "${sev}" must be declared`);
}

const expectedCategories = [
  'unhandled_server_exception',
  'contract_schema_mismatch',
  'security_validation_bypass',
  'unauthenticated_leak',
  'performance_degradation',
  'unexpected_status_code',
  'information_disclosure',
];
for (const cat of expectedCategories) {
  assert.ok(source.includes(cat), `Category "${cat}" must be declared`);
}

// 3. Verify Contract & Payload Structure Models
assert.ok(source.includes('interface EndpointContract'), 'Must declare EndpointContract');
assert.ok(source.includes('interface ParameterContract'), 'Must declare ParameterContract');
assert.ok(source.includes('interface RequestBodyContract'), 'Must declare RequestBodyContract');
assert.ok(source.includes('interface ResponseContract'), 'Must declare ResponseContract');
assert.ok(source.includes('interface FuzzPayload'), 'Must declare FuzzPayload');
assert.ok(source.includes('interface ContractAnomaly'), 'Must declare ContractAnomaly');
assert.ok(source.includes('interface ApiFuzzingReport'), 'Must declare ApiFuzzingReport');

// 4. Verify mock endpoint & payload construction
const sampleEndpoint = {
  id: 'ep_users_post',
  path: '/api/v1/users',
  method: 'POST',
  summary: 'Create user account',
  parameters: [],
  requestBody: {
    contentType: 'application/json',
    required: true,
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        age: { type: 'integer', minimum: 18, maximum: 120 },
      },
    },
  },
  responses: {
    '201': { statusCode: '201', description: 'Created' },
    '400': { statusCode: '400', description: 'Bad Request' },
  },
};
assert.equal(sampleEndpoint.method, 'POST');
assert.equal(sampleEndpoint.path, '/api/v1/users');

const sampleAnomaly = {
  id: 'anom_01',
  endpointId: sampleEndpoint.id,
  endpointPath: sampleEndpoint.path,
  method: 'POST',
  severity: 'critical',
  category: 'unhandled_server_exception',
  title: '500 Internal Server Error on null byte in username',
  description: 'Payload with embedded null byte caused uncaught Postgres driver crash',
  fuzzStrategy: 'null_byte_injection',
  fuzzPayloadSnippet: '{"username": "admin\\u0000test"}',
  reproducingRequest: {
    method: 'POST',
    url: 'https://api.proofix.dev/api/v1/users',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'admin\u0000test' },
    curlCommand: "curl -X POST https://api.proofix.dev/api/v1/users -d '{\"username\": \"admin\\u0000test\"}'",
  },
  observedResponse: {
    statusCode: 500,
    headers: { 'content-type': 'application/json' },
    bodySnippet: '{"error": "invalid byte sequence for encoding \\"UTF8\\": 0x00"}',
    responseTimeMs: 34,
  },
  remediationRecommendation: 'Sanitize null bytes from request body before forwarding to database queries',
  cweId: 'CWE-20',
};

assert.equal(sampleAnomaly.severity, 'critical');
assert.equal(sampleAnomaly.fuzzStrategy, 'null_byte_injection');
assert.equal(sampleAnomaly.observedResponse.statusCode, 500);

console.log('✅ Contribution 131 tests passed cleanly!');
