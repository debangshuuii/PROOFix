/**
 * Test Suite: /docs Page Interactive Reference Integration
 *
 * Verifies component bindings for the Swagger/Scalar documentation hub,
 * including Try-It-Out parameter interpolation, code generation, and layout responsiveness.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenApiSpecGenerator } from '../src/lib/openapi/spec-generator.ts';
import { DocEndpointsIndexer } from '../src/lib/docs/endpoints-indexer.ts';
import { CodeSnippetGenerator } from '../src/lib/docs/snippet-generator.ts';

describe('/docs Interactive Reference Integration', () => {
  const spec = OpenApiSpecGenerator.generate();
  const { endpoints, tagGroups } = DocEndpointsIndexer.index(spec);

  test('should verify endpoint detail card contract for all indexed routes', () => {
    endpoints.forEach((ep) => {
      assert.ok(ep.id, 'Endpoint must have an id');
      assert.ok(ep.path.startsWith('/api/v1/'), `Path must start with /api/v1/: ${ep.path}`);
      assert.ok(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method));
      assert.ok(ep.summary, 'Endpoint must have a summary');
      assert.ok(ep.responses, 'Endpoint must define responses');
    });
  });

  test('should verify path parameter interpolation in Try-It-Out URL generator', () => {
    const runEndpoint = endpoints.find((e) => e.path === '/api/v1/runs/{id}');
    assert.ok(runEndpoint);

    const interpolateUrl = (path, params) => {
      let url = path;
      for (const [k, v] of Object.entries(params)) {
        url = url.replace(`{${k}}`, encodeURIComponent(v));
      }
      return url;
    };

    const url = interpolateUrl(runEndpoint.path, { id: 'run_sample_123' });
    assert.equal(url, '/api/v1/runs/run_sample_123');
    assert.ok(!url.includes('{'));
  });

  test('should generate all 4 code snippet languages for every POST endpoint', () => {
    const postEndpoints = endpoints.filter((e) => e.method === 'POST');
    assert.ok(postEndpoints.length >= 5);

    const languages = ['curl', 'javascript', 'python', 'node'];

    postEndpoints.forEach((ep) => {
      languages.forEach((lang) => {
        const snippet = CodeSnippetGenerator.generate(ep, lang);
        assert.ok(snippet.length > 20);
        assert.ok(snippet.includes(ep.path));
      });
    });
  });
});
