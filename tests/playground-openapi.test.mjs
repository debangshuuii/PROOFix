import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenApiSpecGenerator } from '../src/lib/openapi/spec-generator.ts';

test('OpenApiSpecGenerator includes Playground tag and paths in OpenAPI 3.1 spec', () => {
  const spec = OpenApiSpecGenerator.generate();

  assert.equal(spec.openapi, '3.1.0');

  // Verify tag
  const tag = spec.tags?.find((t) => t.name === 'Playground');
  assert.ok(tag, 'Must include Playground tag');

  // Verify paths
  const paths = Object.keys(spec.paths);
  assert.ok(paths.includes('/api/v1/playground/scenarios'));
  assert.ok(paths.includes('/api/v1/playground/scenarios/{id}'));
  assert.ok(paths.includes('/api/v1/playground/launch'));
  assert.ok(paths.includes('/api/v1/playground/apply-fix'));
  assert.ok(paths.includes('/api/v1/playground/reset'));

  // Verify schemas
  const schemas = spec.components?.schemas;
  assert.ok(schemas?.DemoScenario);
  assert.ok(schemas?.PlaygroundLaunchRequest);
  assert.ok(schemas?.PlaygroundApplyFixRequest);
});

test('OpenApiSpecGenerator.toJson outputs valid JSON containing playground routes', () => {
  const jsonString = OpenApiSpecGenerator.toJson();
  assert.ok(jsonString.includes('/api/v1/playground/scenarios'));
  assert.ok(jsonString.includes('DemoScenario'));
});
