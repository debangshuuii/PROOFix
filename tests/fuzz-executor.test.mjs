import assert from 'node:assert/strict';
import {
  buildRequestUrl,
  buildRequestBody,
  FuzzExecutor,
} from '../src/lib/fuzzing/fuzz-executor.ts';

console.log('--- Testing High-Throughput HTTP Fuzzing Executor (Contribution 135) ---');

function testUrlAndBodyBuilding() {
  const endpoint = {
    id: 'ep_users_update',
    path: '/api/v1/users/{userId}/roles',
    method: 'PUT',
    parameters: [
      { in: 'path', name: 'userId', required: true, type: 'string' },
      { in: 'query', name: 'dryRun', required: false, type: 'boolean' },
    ],
    requestBody: {
      contentType: 'application/json',
      required: true,
      schema: {
        type: 'object',
        properties: {
          role: { type: 'string', default: 'member' },
          priority: { type: 'integer', minimum: 1 },
        },
      },
    },
    responses: {},
  };

  // 1. Target Path Parameter
  const pathPayload = {
    id: 'p1',
    strategy: 'null_byte_injection',
    endpointId: endpoint.id,
    targetParameter: 'userId',
    value: 'admin\u0000root',
    description: 'Path traversal null byte',
  };

  const { url, queryParams } = buildRequestUrl('https://api.test.dev', endpoint.path, endpoint.parameters, pathPayload);
  assert.ok(url.includes('admin%00root'));
  assert.equal(queryParams.dryRun, 'sample');

  // 2. Target Body Field
  const bodyPayload = {
    id: 'p2',
    strategy: 'boundary_values',
    endpointId: endpoint.id,
    targetField: 'priority',
    value: 2147483647,
    description: 'Max integer priority',
  };

  const body = buildRequestBody(endpoint, bodyPayload);
  assert.equal(body.role, 'member');
  assert.equal(body.priority, 2147483647);
  console.log('[PASS] URL path parameter interpolation and body mutation assembly verified.');
}

async function testMockFetchExecution() {
  const endpoint = {
    id: 'ep_ping',
    path: '/api/ping',
    method: 'GET',
    parameters: [],
    responses: {},
  };

  const mockFetch = async (url, options) => {
    return {
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: async () => JSON.stringify({ pong: true }),
    };
  };

  const executor = new FuzzExecutor({
    baseUrl: 'http://localhost:3000',
    fetchFn: mockFetch,
  });

  const payload = {
    id: 'p_test',
    strategy: 'boundary_values',
    endpointId: endpoint.id,
    value: 'test',
    description: 'Ping test',
  };

  const req = executor.prepareRequest(endpoint, payload);
  const result = await executor.executeSingle(req);

  assert.equal(result.endpointId, endpoint.id);
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.response.statusText, 'OK');
  assert.ok(result.response.bodySnippet.includes('"pong":true'));
  assert.ok(result.response.responseTimeMs >= 0);
  console.log('[PASS] Single execution with mock fetch captures status, headers, and duration.');
}

async function testBatchConcurrencyExecution() {
  const endpoint = {
    id: 'ep_batch',
    path: '/api/items',
    method: 'GET',
    parameters: [],
    responses: {},
  };

  let activeRequests = 0;
  let maxActiveRequests = 0;

  const mockFetch = async () => {
    activeRequests++;
    if (activeRequests > maxActiveRequests) maxActiveRequests = activeRequests;
    await new Promise((r) => setTimeout(r, 15));
    activeRequests--;
    return {
      status: 200,
      statusText: 'OK',
      headers: new Map(),
      text: async () => '{"ok": true}',
    };
  };

  const executor = new FuzzExecutor({
    baseUrl: 'http://localhost:3000',
    concurrencyLimit: 3,
    fetchFn: mockFetch,
  });

  const payloads = [1, 2, 3, 4, 5, 6].map((i) => ({
    id: `p_batch_${i}`,
    strategy: 'boundary_values',
    endpointId: endpoint.id,
    value: i,
    description: `Batch ${i}`,
  }));

  let progressReported = 0;
  const results = await executor.executeBatch(endpoint, payloads, (done, total) => {
    progressReported = done;
  });

  assert.equal(results.length, 6);
  assert.equal(progressReported, 6);
  assert.ok(maxActiveRequests <= 3, `Max active requests (${maxActiveRequests}) must not exceed pool limit (3)`);
  console.log('[PASS] Batch execution enforces concurrency pool limit and tracks progress.');
}

testUrlAndBodyBuilding();
await testMockFetchExecution();
await testBatchConcurrencyExecution();

console.log('\nAll Contribution 135 tests passed cleanly!');
