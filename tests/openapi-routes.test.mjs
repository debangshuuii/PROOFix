/**
 * Test Suite: OpenAPI JSON Route & Header Verification
 *
 * Tests GET /api/v1/openapi.json route execution, CORS headers,
 * caching headers, and JSON serialization integrity.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getOpenApiJson, OPTIONS } from '../src/app/api/v1/openapi.json/route.ts';

describe('OpenAPI JSON Route Handler & Headers', () => {
  test('should return 200 OK with application/json and CORS headers', async () => {
    const response = await getOpenApiJson();

    assert.equal(response.status, 200);

    const headers = response.headers;
    assert.equal(headers.get('Content-Type'), 'application/json; charset=utf-8');
    assert.equal(headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(headers.get('Cache-Control').includes('public'));

    const body = await response.json();
    assert.equal(body.openapi, '3.1.0');
    assert.ok(body.paths['/api/v1/projects']);
    assert.ok(body.paths['/api/v1/runs/{id}']);
  });

  test('should return 204 No Content for OPTIONS preflight requests', async () => {
    const response = await OPTIONS();

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(response.headers.get('Access-Control-Allow-Methods').includes('GET'));
  });
});
