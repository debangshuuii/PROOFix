import assert from 'node:assert/strict';
import {
  FaultInjector,
  doesRuleApply,
} from '../src/lib/replay/fault-injector.ts';

console.log('--- Testing Fault & Chaos Injection Engine (Contribution 145) ---');

const dummyReq = {
  method: 'POST',
  url: 'https://api.stripe.com/v1/payment_intents',
  path: '/v1/payment_intents',
  queryParams: {},
  headers: {},
  timestamp: new Date().toISOString(),
};

const dummyRes = {
  statusCode: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"status":"succeeded"}',
  durationMs: 30,
};

async function testRateLimitInjection() {
  const injector = new FaultInjector([
    {
      id: 'fault_stripe_429',
      name: 'Stripe 429 Throttle',
      enabled: true,
      targetProvider: 'stripe',
      faultType: 'rate_limit_429',
      params: { retryAfterSecs: 45 },
    },
  ]);

  const result = await injector.evaluateFault(dummyReq, dummyRes, 'stripe');
  assert.equal(result.intercepted, true);
  assert.ok(result.modifiedResponse);
  assert.equal(result.modifiedResponse.statusCode, 429);
  assert.equal(result.modifiedResponse.headers['retry-after'], '45');
  assert.ok(result.modifiedResponse.body.includes('Rate limit exceeded'));
  console.log('[PASS] Rate limit 429 fault injection returned Retry-After header.');
}

async function testStatusOverrideAndLatency() {
  const injector = new FaultInjector([
    {
      id: 'fault_github_503',
      name: 'GitHub Outage 503',
      enabled: true,
      urlPattern: '.*api\\.github\\.com.*',
      faultType: 'http_status_override',
      params: { statusCode: 503, statusText: 'Service Unavailable', delayMs: 40 },
    },
  ]);

  const ghReq = {
    method: 'GET',
    url: 'https://api.github.com/repos/octocat/hello',
    path: '/repos/octocat/hello',
    queryParams: {},
    headers: {},
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();
  const result = await injector.evaluateFault(ghReq, dummyRes, 'github');
  const elapsed = Date.now() - startTime;

  assert.equal(result.intercepted, true);
  assert.equal(result.modifiedResponse.statusCode, 503);
  assert.equal(result.modifiedResponse.statusText, 'Service Unavailable');
  assert.ok(elapsed >= 35, 'Must have awaited delayMs');
  console.log('[PASS] HTTP status override to 503 with simulated network latency verified.');
}

async function testConnectionResetError() {
  const injector = new FaultInjector([
    {
      id: 'fault_reset',
      name: 'Drop connection',
      enabled: true,
      faultType: 'connection_reset',
      params: { errorMessage: 'Simulated ECONNRESET' },
    },
  ]);

  const result = await injector.evaluateFault(dummyReq, dummyRes, 'stripe');
  assert.equal(result.intercepted, true);
  assert.ok(result.errorToThrow);
  assert.equal(result.errorToThrow.message, 'Simulated ECONNRESET');
  assert.equal(result.errorToThrow.code, 'ECONNRESET');
  console.log('[PASS] Connection reset fault generates ECONNRESET error.');
}

async function testCorruptedJson() {
  const injector = new FaultInjector([
    {
      id: 'fault_corrupt',
      name: 'Corrupt payload',
      enabled: true,
      faultType: 'corrupted_json',
      params: {},
    },
  ]);

  const result = await injector.evaluateFault(dummyReq, dummyRes, 'stripe');
  assert.equal(result.intercepted, true);
  assert.throws(() => JSON.parse(result.modifiedResponse.body), SyntaxError);
  console.log('[PASS] Corrupted JSON fault produces malformed JSON string.');
}

await testRateLimitInjection();
await testStatusOverrideAndLatency();
await testConnectionResetError();
await testCorruptedJson();

console.log('\nAll Contribution 145 tests passed cleanly!');
