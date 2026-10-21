import assert from 'node:assert/strict';
import {
  convertNextPathToOpenApiPath,
  extractHttpMethodsFromSource,
  parseRouteFileContent,
  sniffNextJsRoutes,
  synthesizeOpenApiSpec,
} from '../src/lib/fuzzing/route-sniffer.ts';

console.log('--- Testing OpenAPI Spec Auto-Synthesizer & Route Sniffer (Contribution 137) ---');

function testPathConversion() {
  const sample1 = 'src/app/api/v1/runs/[id]/live/route.ts';
  const res1 = convertNextPathToOpenApiPath(sample1);
  assert.equal(res1.apiPath, '/api/v1/runs/{id}/live');
  assert.equal(res1.pathParameters.length, 1);
  assert.equal(res1.pathParameters[0].name, 'id');
  assert.equal(res1.pathParameters[0].in, 'path');

  const sample2 = 'src/app/api/docs/[...slug]/route.ts';
  const res2 = convertNextPathToOpenApiPath(sample2);
  assert.equal(res2.apiPath, '/api/docs/{slug}');
  assert.equal(res2.pathParameters[0].name, 'slug');
  console.log('[PASS] Next.js dynamic [id] and catch-all [...slug] converted to OpenAPI path parameters.');
}

function testMethodExtraction() {
  const dummySource = `
    import { NextResponse } from 'next/server';

    export async function GET(req: Request) {
      return NextResponse.json({ ok: true });
    }

    export async function POST(req: Request) {
      return NextResponse.json({ created: true });
    }

    export async function DELETE(req: Request) {
      return NextResponse.json({ deleted: true });
    }
  `;

  const methods = extractHttpMethodsFromSource(dummySource);
  assert.equal(methods.length, 3);
  assert.ok(methods.includes('GET'));
  assert.ok(methods.includes('POST'));
  assert.ok(methods.includes('DELETE'));
  console.log('[PASS] Exported HTTP method signatures extracted from TypeScript route source.');
}

function testRouteFileParsing() {
  const filePath = 'src/app/api/v1/projects/[projectId]/verify/route.ts';
  const source = `
    export async function POST(req) {
      return Response.json({ status: 'started' });
    }
  `;

  const endpoints = parseRouteFileContent(filePath, source);
  assert.equal(endpoints.length, 1);
  const ep = endpoints[0];
  assert.equal(ep.method, 'POST');
  assert.equal(ep.path, '/api/v1/projects/{projectId}/verify');
  assert.equal(ep.parameters.length, 1);
  assert.equal(ep.parameters[0].name, 'projectId');
  assert.ok(ep.requestBody);
  console.log('[PASS] Route file parsed into comprehensive EndpointContract.');
}

function testLiveProjectRouteSniffing() {
  const endpoints = sniffNextJsRoutes(process.cwd());
  assert.ok(endpoints.length > 5, `Expected to discover at least 5 API routes in PROOFix, found: ${endpoints.length}`);

  // Must find live and control routes from Feature 3
  const hasLiveRoute = endpoints.some((e) => e.path.includes('/api/v1/runs/{id}/live'));
  const hasControlRoute = endpoints.some((e) => e.path.includes('/api/v1/runs/{id}/control'));
  assert.ok(hasLiveRoute, 'Must discover /api/v1/runs/{id}/live route');
  assert.ok(hasControlRoute, 'Must discover /api/v1/runs/{id}/control route');

  // Synthesize OpenAPI spec
  const spec = synthesizeOpenApiSpec(endpoints, 'PROOFix Generated API');
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.info.title, 'PROOFix Generated API');
  assert.ok(Object.keys(spec.paths).length > 5);
  console.log(`[PASS] Live codebase route sniffer discovered ${endpoints.length} operations across ${Object.keys(spec.paths).length} API paths.`);
}

testPathConversion();
testMethodExtraction();
testRouteFileParsing();
testLiveProjectRouteSniffing();

console.log('\nAll Contribution 137 tests passed cleanly!');
