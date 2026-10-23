/**
 * Test Suite: OpenAPI YAML Serialization & Route Verification
 *
 * Verifies zero-dependency YAML serialization, YAML response headers,
 * and structural fidelity of the exported YAML OpenAPI spec.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenApiYamlSerializer } from '../src/lib/openapi/yaml-serializer.ts';
import { GET as getOpenApiYaml } from '../src/app/api/v1/openapi.yaml/route.ts';

describe('OpenAPI YAML Serialization & Route Handler', () => {
  test('should serialize sample nested object to valid YAML syntax', () => {
    const sample = {
      openapi: '3.1.0',
      info: {
        title: 'Test Service',
        version: '1.0.0',
      },
      tags: ['Projects', 'Runs'],
    };

    const yaml = OpenApiYamlSerializer.stringify(sample);
    assert.ok(yaml.includes('openapi:'));
    assert.ok(yaml.includes('Test Service'));
    assert.ok(yaml.includes('Projects'));
    assert.ok(yaml.includes('Runs'));
  });

  test('should execute GET /api/v1/openapi.yaml and return text/yaml headers', async () => {
    const response = await getOpenApiYaml();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/yaml; charset=utf-8');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');

    const text = await response.text();
    assert.ok(text.includes('openapi:'));
    assert.ok(text.includes('paths:'));
    assert.ok(text.includes('/api/v1/projects:'));
    assert.ok(text.includes('components:'));
  });
});
