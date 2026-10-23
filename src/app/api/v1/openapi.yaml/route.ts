/**
 * OpenAPI 3.1 YAML Specification Route
 *
 * GET /api/v1/openapi.yaml
 *
 * Exposes OpenAPI 3.1 in text/yaml format for Swagger CLI, Spectral, and code generators.
 */

import { NextResponse } from 'next/server';
import { OpenApiSpecGenerator } from '@/lib/openapi/spec-generator';
import { OpenApiYamlSerializer } from '@/lib/openapi/yaml-serializer';

export async function GET() {
  const spec = OpenApiSpecGenerator.generate();
  const yamlContent = OpenApiYamlSerializer.stringify(spec).trim();

  return new NextResponse(yamlContent, {
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
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PROOFix-Api-Key',
    },
  });
}
