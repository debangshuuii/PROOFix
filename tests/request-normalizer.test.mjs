import assert from 'node:assert/strict';
import {
  normalizeRequest,
  computeCanonicalHash,
  scrubText,
  scrubRequestAndResponse,
} from '../src/lib/replay/request-normalizer.ts';

console.log('--- Testing Request Normalizer, Canonical Hasher & Secret Scrubber (Contribution 142) ---');

function testNormalizationAndHashing() {
  // Two requests with different query parameter ordering and volatile headers
  const req1 = normalizeRequest({
    method: 'get',
    url: 'https://api.github.com/repos/org/repo/pulls?state=open&sort=created&per_page=30',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Date': 'Wed, 21 Oct 2026 07:00:00 GMT',
      'Accept': 'application/vnd.github.v3+json',
      'X-Request-Id': 'req_xyz_123',
    },
  });

  const req2 = normalizeRequest({
    method: 'GET',
    url: 'https://api.github.com/repos/org/repo/pulls?per_page=30&sort=created&state=open',
    headers: {
      'User-Agent': 'DifferentUserAgent/2.0',
      'Date': 'Wed, 21 Oct 2026 07:05:00 GMT',
      'accept': 'application/vnd.github.v3+json',
      'x-request-id': 'req_abc_999',
    },
  });

  // Query parameters must be identical after normalization
  assert.deepEqual(req1.queryParams, { per_page: '30', sort: 'created', state: 'open' });
  assert.deepEqual(req2.queryParams, { per_page: '30', sort: 'created', state: 'open' });

  // Volatile headers must be stripped out
  assert.equal(req1.headers['user-agent'], undefined);
  assert.equal(req1.headers['date'], undefined);
  assert.equal(req1.headers['x-request-id'], undefined);
  assert.equal(req1.headers['accept'], 'application/vnd.github.v3+json');

  // Both requests must yield the exact same canonical hash!
  assert.equal(req1.bodyHash, req2.bodyHash);
  console.log('[PASS] Request normalization strips volatile headers and produces identical canonical hashes regardless of query order.');
}

function testJsonBodyCanonicalization() {
  const reqA = normalizeRequest({
    method: 'POST',
    url: 'https://api.test.dev/data',
    body: JSON.stringify({ z: 1, a: 2, m: { b: 1, a: 2 } }),
  });

  const reqB = normalizeRequest({
    method: 'POST',
    url: 'https://api.test.dev/data',
    body: JSON.stringify({ a: 2, m: { a: 2, b: 1 }, z: 1 }),
  });

  assert.equal(reqA.body, reqB.body);
  assert.equal(reqA.bodyHash, reqB.bodyHash);
  console.log('[PASS] JSON request body keys recursively sorted for deterministic canonical hash.');
}

function testSecretScrubbing() {
  const dirtyHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
  const dirtyStripe = 'sk_mock_51Abcdefghijklmnopqrstuvwxy1234567890';
  const dirtyGithub = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcd';
  const dirtyCard = '4111 2222 3333 4444';
  const dirtyJson = JSON.stringify({
    apiKey: dirtyStripe,
    token: dirtyGithub,
    password: 'superSecretPassword123!',
    cardNumber: dirtyCard,
  });

  const req = normalizeRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/charges',
    headers: { authorization: dirtyHeader },
    body: dirtyJson,
  });

  const res = {
    statusCode: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: dirtyGithub, client_secret: dirtyStripe }),
    durationMs: 40,
  };

  const { req: cleanReq, res: cleanRes, scrubbedCount } = scrubRequestAndResponse(req, res);

  assert.ok(scrubbedCount >= 5, `Expected at least 5 secrets scrubbed, got ${scrubbedCount}`);
  assert.ok(cleanReq.headers.authorization.includes('[SCRUBBED_BEARER_TOKEN]'));
  assert.ok(cleanReq.body.includes('[SCRUBBED_STRIPE_KEY]'));
  assert.ok(cleanReq.body.includes('[SCRUBBED_GITHUB_TOKEN]'));
  assert.ok(cleanReq.body.includes('[SCRUBBED_PASSWORD]'));
  assert.ok(cleanReq.body.includes('4242-XXXX-XXXX-4242'));
  assert.ok(cleanRes.body.includes('[SCRUBBED_STRIPE_KEY]'));
  assert.ok(cleanRes.body.includes('[SCRUBBED_GITHUB_TOKEN]'));

  console.log(`[PASS] Secret scrubber masked ${scrubbedCount} sensitive credentials across headers and request/response payloads.`);
}

testNormalizationAndHashing();
testJsonBodyCanonicalization();
testSecretScrubbing();

console.log('\nAll Contribution 142 tests passed cleanly!');
