import assert from 'node:assert/strict';
import { NetworkInterceptor } from '../src/lib/replay/network-interceptor.ts';
import { normalizeRequest } from '../src/lib/replay/request-normalizer.ts';

console.log('--- Testing Network Interceptor & Replay Proxy Bridge (Contribution 146) ---');

function createSampleCassette() {
  const normReq = normalizeRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/payment_intents',
    body: 'amount=2000&currency=usd',
  });

  return {
    id: 'cas_test_interceptor',
    name: 'interceptor_sample',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scope: 'test',
    interactions: [
      {
        id: 'int_pi_1',
        order: 1,
        provider: 'stripe',
        request: normReq,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 'pi_replayed_123', status: 'succeeded' }),
          durationMs: 40,
        },
        timesReplayed: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

async function testReplayHit() {
  let realNetworkCalled = false;
  const mockBaseFetch = async () => {
    realNetworkCalled = true;
    return new Response('{"live": true}', { status: 200 });
  };

  const cassette = createSampleCassette();
  const interceptor = new NetworkInterceptor({
    mode: 'replay',
    cassette,
    baseFetch: mockBaseFetch,
  });

  const customFetch = interceptor.getFetch();

  const response = await customFetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    body: 'amount=2000&currency=usd',
  });

  assert.equal(realNetworkCalled, false, 'Real network must NOT be contacted on cassette hit');
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.id, 'pi_replayed_123');

  const stats = interceptor.getStats();
  assert.equal(stats.totalRequestsIntercepted, 1);
  assert.equal(stats.cassetteHits, 1);
  assert.equal(stats.cassetteMisses, 0);

  console.log('[PASS] Replay mode returns deterministic mock response without network access.');
}

async function testStrictReplayMiss() {
  const cassette = createSampleCassette();
  const interceptor = new NetworkInterceptor({
    mode: 'replay',
    cassette,
    allowedUnmatchedCalls: false,
  });

  const customFetch = interceptor.getFetch();

  await assert.rejects(
    async () => {
      await customFetch('https://api.stripe.com/v1/unknown_endpoint', { method: 'GET' });
    },
    /Unmatched outbound network call/
  );

  const stats = interceptor.getStats();
  assert.equal(stats.cassetteMisses, 1);
  console.log('[PASS] Strict replay mode rejects unexpected external calls.');
}

async function testFaultInjectionOnReplay() {
  const cassette = createSampleCassette();
  const interceptor = new NetworkInterceptor({
    mode: 'replay',
    cassette,
    faultRules: [
      {
        id: 'fault_429',
        name: 'Rate limit Stripe',
        enabled: true,
        targetProvider: 'stripe',
        faultType: 'rate_limit_429',
        params: { retryAfterSecs: 30 },
      },
    ],
  });

  const customFetch = interceptor.getFetch();
  const response = await customFetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    body: 'amount=2000&currency=usd',
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '30');

  const stats = interceptor.getStats();
  assert.equal(stats.cassetteHits, 1);
  assert.equal(stats.faultsInjected, 1);
  console.log('[PASS] Fault injection engine overrides replayed response with 429 Rate Limit.');
}

await testReplayHit();
await testStrictReplayMiss();
await testFaultInjectionOnReplay();

console.log('\nAll Contribution 146 tests passed cleanly!');
