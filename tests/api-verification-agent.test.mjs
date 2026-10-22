/**
 * Backend API Verification Agent Test Suite
 * Validates endpoint discovery, synthetic payload generation, response status assertions,
 * and stack trace / database error leak detection.
 */

import assert from 'assert';
import { discoverApiEndpoints } from '../src/lib/testing/api-endpoint-discoverer.ts';
import { generateSyntheticPayload } from '../src/lib/testing/api-payload-generator.ts';
import { validateApiResponse } from '../src/lib/testing/api-response-validator.ts';

console.log('===========================================================');
console.log('PROOFix Backend API Verification Agent Test Suite');
console.log('===========================================================\n');

async function runTestSuite() {
  let passed = 0;

  // 1. API Endpoint Discovery from Route Manifest
  console.log('[TEST 1] API Endpoint Discovery & HTTP Method Inference');
  const mockRoutes = [
    { path: '/', type: 'page', fileSource: 'page.tsx', isDynamic: false },
    { path: '/api/data', type: 'api', fileSource: 'src/app/api/data/route.ts', isDynamic: false },
    { path: '/api/users', type: 'api', method: 'POST', fileSource: 'src/app/api/users/route.ts', isDynamic: false },
    { path: '/about', type: 'page', fileSource: 'about.tsx', isDynamic: false },
  ];

  const endpoints = discoverApiEndpoints(mockRoutes);
  assert.strictEqual(endpoints.length, 2, 'Only 2 routes of type API must be extracted');
  assert.strictEqual(endpoints[0].path, '/api/data');
  assert.ok(endpoints[0].methods.includes('GET'));
  assert.strictEqual(endpoints[1].path, '/api/users');
  assert.ok(endpoints[1].methods.includes('POST'));

  console.log(`  ✓ Discovered ${endpoints.length} API endpoints with inferred HTTP verbs.`);
  passed++;

  // 2. Synthetic Payload Generation
  console.log('[TEST 2] Semantic Synthetic Payload Generation');
  const getPayload = generateSyntheticPayload('/api/data', 'GET');
  assert.strictEqual(getPayload.method, 'GET');
  assert.strictEqual(getPayload.body, undefined, 'GET requests should not have body');

  const postPayload = generateSyntheticPayload('/api/auth/login', 'POST');
  assert.strictEqual(postPayload.method, 'POST');
  assert.ok(postPayload.body, 'POST request must contain body');
  assert.ok(postPayload.body.includes('verifier@proofix.dev'), 'Auth payload must include synthetic credentials');

  const productPayload = generateSyntheticPayload('/api/products/create', 'POST');
  assert.ok(productPayload.body.includes('Verification Probe Item'));

  console.log('  ✓ Synthetic payloads correctly adapted to path semantics.');
  passed++;

  // 3. Response Status & Stack Trace Leak Validation
  console.log('[TEST 3] Response Status & Vulnerability Leak Detection');

  // Case A: Clean 200 OK
  const cleanResult = validateApiResponse(
    '/api/health',
    'GET',
    200,
    'OK',
    JSON.stringify({ status: 'ok', uptime: 120 }),
    45
  );
  assert.strictEqual(cleanResult.passed, true);
  assert.strictEqual(cleanResult.hasStackTraceLeak, false);
  assert.strictEqual(cleanResult.hasDatabaseLeak, false);

  // Case B: 500 Internal Server Error
  const crashResult = validateApiResponse(
    '/api/data',
    'GET',
    500,
    'Internal Server Error',
    JSON.stringify({ error: 'Database connection failed' }),
    120
  );
  assert.strictEqual(crashResult.passed, false);
  assert.strictEqual(crashResult.statusCode, 500);
  assert.ok(crashResult.error.includes('crashed with HTTP 500'));

  // Case C: Stack Trace Leakage
  const stackLeak = validateApiResponse(
    '/api/users',
    'POST',
    200, // Status might be 200 but leaked trace
    'OK',
    'TypeError: Cannot read properties of undefined (reading "id") at Object.handler (/app/route.ts:14:22)',
    60
  );
  assert.strictEqual(stackLeak.passed, false);
  assert.strictEqual(stackLeak.hasStackTraceLeak, true);
  assert.ok(stackLeak.error.includes('stack trace leaked'));

  // Case D: Database Credentials / Connection Leakage
  const dbLeak = validateApiResponse(
    '/api/items',
    'GET',
    200,
    'OK',
    'Error: ECONNREFUSED 127.0.0.1:5432 - password authentication failed for user "postgres"',
    30
  );
  assert.strictEqual(dbLeak.passed, false);
  assert.strictEqual(dbLeak.hasDatabaseLeak, true);

  console.log('  ✓ Response validator traps 500 crashes, stack traces, and database leaks.');
  passed++;

  console.log('===========================================================');
  console.log(`ALL ${passed} BACKEND API VERIFICATION TESTS PASSED!`);
  console.log('===========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
