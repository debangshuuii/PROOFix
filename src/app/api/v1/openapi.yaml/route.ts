/**
 * OpenAPI 3.1 YAML Specification Route
 *
 * GET /api/v1/openapi.yaml
 *
 * Exposes OpenAPI 3.1 in text/yaml format for Swagger CLI, Spectral, and code generators.
 */

import { OpenApiSpecGenerator } from '../../../../lib/openapi/spec-generator.ts';
import { OpenApiYamlSerializer } from '../../../../lib/openapi/yaml-serializer.ts';

export async function GET() {
  const spec = OpenApiSpecGenerator.generate();
  const yamlContent = OpenApiYamlSerializer.stringify(spec).trim();

  return new Response(yamlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PROOFix-Api-Key',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PROOFix-Api-Key',
    },
  });
}
