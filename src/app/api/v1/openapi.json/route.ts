/**
 * OpenAPI 3.1 JSON Specification Route
 *
 * GET /api/v1/openapi.json
 *
 * Exposes live, machine-readable OpenAPI 3.1.0 specification for third-party automation,
 * Swagger/Scalar reference renderers, and CLI integration.
 */

import { NextResponse } from 'next/server';
import { OpenApiSpecGenerator } from '@/lib/openapi/spec-generator';

export async function GET() {
  const spec = OpenApiSpecGenerator.generate();

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
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
