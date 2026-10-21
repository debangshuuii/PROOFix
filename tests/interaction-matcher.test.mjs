import assert from 'node:assert/strict';
import {
  InteractionMatcher,
  calculateJsonSimilarity,
} from '../src/lib/replay/interaction-matcher.ts';
import { normalizeRequest } from '../src/lib/replay/request-normalizer.ts';

console.log('--- Testing Deterministic Interaction Matcher (Contribution 144) ---');

function testJsonSimilarityCalculation() {
  const jsonA = JSON.stringify({ id: 1, name: 'Alice', age: 30 });
  const jsonB = JSON.stringify({ id: 2, name: 'Bob', age: 31 });
  const jsonC = JSON.stringify({ query: 'hello', limit: 10 });

  assert.equal(calculateJsonSimilarity(jsonA, jsonB), 1.0, 'Identical keys must yield 1.0 similarity');
  assert.equal(calculateJsonSimilarity(jsonA, jsonC), 0.0, 'Disjoint keys must yield 0.0 similarity');
  console.log('[PASS] JSON schema key similarity calculation verified.');
}

function testExactAndSequenceMatching() {
  const matcher = new InteractionMatcher();

  // Create a cassette with 2 sequential GET /v1/jobs/123 requests (polling status)
  const reqNorm = normalizeRequest({
    method: 'GET',
    url: 'https://api.test.dev/v1/jobs/123',
  });

  const cassette = {
    id: 'cas_seq_test',
    name: 'job_polling',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scope: 'test',
    interactions: [
      {
        id: 'int_poll_1',
        order: 1,
        request: reqNorm,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify({ status: 'pending' }),
          durationMs: 20,
        },
        timesReplayed: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int_poll_2',
        order: 2,
        request: reqNorm,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify({ status: 'completed', resultUrl: 'https://cdn.test.dev/file.pdf' }),
          durationMs: 25,
        },
        timesReplayed: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  // First poll call: must return interaction #1 ("pending")
  const match1 = matcher.match(reqNorm, cassette, 'exact');
  assert.equal(match1.confidence, 1.0);
  assert.equal(match1.matched.id, 'int_poll_1');
  assert.ok(match1.matched.response.body.includes('"pending"'));

  // Second poll call: must return interaction #2 ("completed")!
  const match2 = matcher.match(reqNorm, cassette, 'exact');
  assert.equal(match2.confidence, 1.0);
  assert.equal(match2.matched.id, 'int_poll_2');
  assert.ok(match2.matched.response.body.includes('"completed"'));

  console.log('[PASS] Deterministic sequence tracking correctly matches sequential polling interactions.');
}

function testFuzzyJsonMatching() {
  const matcher = new InteractionMatcher();

  const recordedReq = normalizeRequest({
    method: 'POST',
    url: 'https://api.test.dev/v1/charges',
    body: JSON.stringify({ amount: 1000, currency: 'usd', customerId: 'cus_1' }),
  });

  const cassette = {
    id: 'cas_fuzzy',
    name: 'fuzzy_test',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scope: 'test',
    interactions: [
      {
        id: 'int_fuzzy_1',
        order: 1,
        request: recordedReq,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {},
          body: '{"chargeId": "ch_123"}',
          durationMs: 30,
        },
        timesReplayed: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  // Incoming request has slightly different values (e.g. amount is 1500 instead of 1000), but same keys
  const incomingReq = normalizeRequest({
    method: 'POST',
    url: 'https://api.test.dev/v1/charges',
    body: JSON.stringify({ amount: 1500, currency: 'usd', customerId: 'cus_2' }),
  });

  // Exact strategy should fail
  const exactRes = matcher.match(incomingReq, cassette, 'exact');
  assert.equal(exactRes.confidence, 0);

  // Fuzzy strategy should succeed with high confidence
  const fuzzyRes = matcher.match(incomingReq, cassette, 'fuzzy_json');
  assert.ok(fuzzyRes.confidence >= 0.8);
  assert.equal(fuzzyRes.matched.id, 'int_fuzzy_1');
  console.log('[PASS] Fuzzy JSON matching matches payload with identical schema keys.');
}

testJsonSimilarityCalculation();
testExactAndSequenceMatching();
testFuzzyJsonMatching();

console.log('\nAll Contribution 144 tests passed cleanly!');
