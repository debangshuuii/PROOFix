/**
 * Test Suite: Documentation Endpoints Indexer & Tag Grouper
 *
 * Verifies endpoint extraction from OpenAPI 3.1 specification,
 * tag grouping hierarchies, and multi-field search filtering.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenApiSpecGenerator } from '../src/lib/openapi/spec-generator.ts';
import { DocEndpointsIndexer } from '../src/lib/docs/endpoints-indexer.ts';

describe('Documentation Endpoints Indexer & Grouper', () => {
  const spec = OpenApiSpecGenerator.generate();
  const { endpoints, tagGroups } = DocEndpointsIndexer.index(spec);

  test('should extract and flatten all endpoints from OpenAPI specification', () => {
    assert.ok(endpoints.length >= 15);

    const paths = endpoints.map((e) => e.path);
    assert.ok(paths.includes('/api/v1/projects'));
    assert.ok(paths.includes('/api/v1/runs/{id}'));
    assert.ok(paths.includes('/api/v1/proposals'));
    assert.ok(paths.includes('/api/v1/health'));
  });

  test('should group endpoints into valid tag groups with counts', () => {
    assert.ok(tagGroups.length >= 10);

    const projectGroup = tagGroups.find((g) => g.name === 'Projects');
    assert.ok(projectGroup);
    assert.ok(projectGroup.endpoints.length >= 2);

    const runsGroup = tagGroups.find((g) => g.name === 'Runs');
    assert.ok(runsGroup);
    assert.ok(runsGroup.endpoints.length >= 3);
  });

  test('should filter endpoints by search query across paths, methods, and tags', () => {
    // Search by path fragment
    const projectResults = DocEndpointsIndexer.search(endpoints, 'projects');
    assert.ok(projectResults.length >= 2);

    // Search by HTTP method
    const postResults = DocEndpointsIndexer.search(endpoints, 'POST');
    assert.ok(postResults.length >= 1);
    assert.ok(postResults.some((e) => e.method === 'POST'));

    // Search by tag keyword
    const sandboxResults = DocEndpointsIndexer.search(endpoints, 'Sandbox');
    assert.ok(sandboxResults.length >= 1);
  });
});
