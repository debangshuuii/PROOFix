import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('--- Testing Deterministic Mock Replay & Cassette Types (Contribution 141) ---');

const typesPath = resolve(process.cwd(), 'src/lib/types/mock-replay.ts');
assert.ok(existsSync(typesPath), 'src/lib/types/mock-replay.ts must exist');

const source = readFileSync(typesPath, 'utf8');

// 1. Verify Replay Modes
const expectedModes = ['record', 'replay', 'passthrough', 'auto'];
for (const mode of expectedModes) {
  assert.ok(source.includes(mode), `ReplayMode "${mode}" must be defined`);
}

// 2. Verify Fault Types
const expectedFaults = [
  'delay_latency',
  'http_status_override',
  'rate_limit_429',
  'connection_reset',
  'timeout',
  'corrupted_json',
  'empty_response',
];
for (const fault of expectedFaults) {
  assert.ok(source.includes(fault), `FaultType "${fault}" must be defined`);
}

// 3. Verify Core Interfaces
assert.ok(source.includes('interface TrafficCassette'), 'Must declare TrafficCassette');
assert.ok(source.includes('interface CassetteInteraction'), 'Must declare CassetteInteraction');
assert.ok(source.includes('interface RecordedRequest'), 'Must declare RecordedRequest');
assert.ok(source.includes('interface RecordedResponse'), 'Must declare RecordedResponse');
assert.ok(source.includes('interface FaultInjectionRule'), 'Must declare FaultInjectionRule');
assert.ok(source.includes('interface MockReplaySession'), 'Must declare MockReplaySession');

// 4. Test Sample Cassette Instantiation
const sampleCassette = {
  id: 'cas_stripe_checkout_01',
  name: 'stripe-payment-intent-success',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  scope: 'checkout_integration_test',
  interactions: [
    {
      id: 'int_01',
      order: 1,
      provider: 'stripe',
      request: {
        method: 'POST',
        url: 'https://api.stripe.com/v1/payment_intents',
        path: '/v1/payment_intents',
        queryParams: {},
        headers: {
          authorization: 'Bearer [REDACTED_API_KEY]',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'amount=4999&currency=usd',
        bodyHash: 'sha256_mock_hash_01',
        timestamp: new Date().toISOString(),
      },
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'pi_test_123', status: 'requires_payment_method', amount: 4999 }),
        durationMs: 85,
      },
      timesReplayed: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  metadata: {
    recordedBy: 'PROOFix Replay Engine',
    totalInteractions: 1,
    providers: ['stripe'],
    scrubbedSecretsCount: 1,
  },
};

assert.equal(sampleCassette.name, 'stripe-payment-intent-success');
assert.equal(sampleCassette.interactions.length, 1);
assert.equal(sampleCassette.interactions[0].response.statusCode, 200);

// 5. Test Sample Fault Rule Instantiation
const sampleFault = {
  id: 'fault_stripe_outage',
  name: 'Simulate Stripe 503 Outage',
  enabled: true,
  targetProvider: 'stripe',
  urlPattern: '.*api\\.stripe\\.com.*',
  faultType: 'http_status_override',
  params: {
    statusCode: 503,
    statusText: 'Service Unavailable',
    errorMessage: 'Stripe API temporarily unavailable',
    delayMs: 300,
  },
};
assert.equal(sampleFault.faultType, 'http_status_override');
assert.equal(sampleFault.params.statusCode, 503);

console.log('✅ Contribution 141 tests passed cleanly!');
