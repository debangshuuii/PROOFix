/**
 * PROOFix Master API Fuzzing & Contract Boundary Testing CI Suite
 * Covering Point 4 / Contributions 131 through 140
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Types & Taxonomy (Contribution 131)
// Types are verified via schema assertions below

// 2. OpenAPI & JSON Schema Contract Parser (Contribution 132)
import {
  parseOpenApiContract,
  resolveSchemaRef,
  normalizeSchema,
} from '../src/lib/fuzzing/contract-parser.ts';

// 3. Boundary & Type Confusion Mutator (Contribution 133)
import {
  generateNumericBoundaryValues,
  generateStringBoundaryValues,
  generateTypeConfusionValues,
  generatePayloadsForEndpoint,
} from '../src/lib/fuzzing/payload-mutator.ts';

// 4. Adversarial Security Mutator (Contribution 134)
import {
  generateAdversarialPayloads,
  NULL_BYTE_PAYLOADS,
  SQLI_PROBE_PAYLOADS,
  XSS_PROBE_PAYLOADS,
  UNICODE_HOMOGLYPH_PAYLOADS,
} from '../src/lib/fuzzing/adversarial-mutator.ts';

// 5. HTTP Fuzzing Executor (Contribution 135)
import {
  buildRequestUrl,
  buildRequestBody,
  FuzzExecutor,
} from '../src/lib/fuzzing/fuzz-executor.ts';

// 6. Anomaly & Vulnerability Classifier (Contribution 136)
import {
  classifyAnomaly,
  generateCurlReproducer,
} from '../src/lib/fuzzing/anomaly-classifier.ts';

// 7. Route Sniffer & Spec Auto-Synthesizer (Contribution 137)
import {
  convertNextPathToOpenApiPath,
  sniffNextJsRoutes,
  synthesizeOpenApiSpec,
} from '../src/lib/fuzzing/route-sniffer.ts';

// 8. Fuzzing Audit Orchestrator (Contribution 138)
import {
  calculateHealthScore,
  runApiFuzzingAudit,
} from '../src/lib/fuzzing/fuzz-orchestrator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log(' PROOFix Master API Fuzzing & Contract Boundary CI Suite        ');
console.log(' Feature: API Fuzzing & Contract Boundary Testing (131–140)     ');
console.log('================================================================\n');

async function runMasterApiFuzzingSuite() {
  // --------------------------------------------------------------------------
  // Test 1: Strategy Taxonomy & Anomaly Schema (Contribution 131)
  // --------------------------------------------------------------------------
  console.log('▶ Test 1: Verifying Fuzz Strategy Taxonomy & Anomaly Schema...');
  const typesSource = fs.readFileSync(path.resolve(__dirname, '../src/lib/types/api-fuzzing.ts'), 'utf8');
  assert.ok(typesSource.includes('boundary_values'), 'Must support boundary_values');
  assert.ok(typesSource.includes('type_confusion'), 'Must support type_confusion');
  assert.ok(typesSource.includes('null_byte_injection'), 'Must support null_byte_injection');
  assert.ok(typesSource.includes('sqli_adversarial'), 'Must support sqli_adversarial');
  assert.ok(typesSource.includes('xss_adversarial'), 'Must support xss_adversarial');
  assert.ok(typesSource.includes('auth_tampering'), 'Must support auth_tampering');
  assert.ok(typesSource.includes('unhandled_server_exception'), 'Must declare unhandled_server_exception category');
  console.log('  ✔ Strategy taxonomy and anomaly schema verified');

  // --------------------------------------------------------------------------
  // Test 2: OpenAPI & JSON Schema Contract Parser (Contribution 132)
  // --------------------------------------------------------------------------
  console.log('▶ Test 2: Verifying OpenAPI & JSON Schema Contract Parser...');
  const sampleSpec = {
    openapi: '3.0.0',
    info: { title: 'Master Test API', version: '1.2.0' },
    paths: {
      '/api/v1/orders/{orderId}': {
        parameters: [{ in: 'path', name: 'orderId', required: true, type: 'string' }],
        get: {
          summary: 'Get Order',
          parameters: [{ in: 'query', name: 'expand', required: false, type: 'boolean' }],
          responses: { '200': { description: 'Success' } },
        },
        post: {
          summary: 'Create Order Item',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sku', 'quantity'],
                  properties: {
                    sku: { type: 'string', minLength: 3 },
                    quantity: { type: 'integer', minimum: 1, maximum: 50 },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
    },
  };

  const parsed = parseOpenApiContract(sampleSpec);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.endpoints.length, 2);
  const postEp = parsed.endpoints.find((e) => e.method === 'POST');
  assert.ok(postEp);
  assert.equal(postEp.requestBody.required, true);
  assert.equal(postEp.requestBody.schema.properties.quantity.maximum, 50);
  console.log('  ✔ OpenAPI 3.0 parsing & schema extraction verified');

  // --------------------------------------------------------------------------
  // Test 3: Boundary Value & Type Confusion Mutator (Contribution 133)
  // --------------------------------------------------------------------------
  console.log('▶ Test 3: Verifying Boundary Value & Type Confusion Mutators...');
  const numBoundaries = generateNumericBoundaryValues({ minimum: 5, maximum: 100 }, { endpointId: 'ep_test' });
  const boundaryVals = numBoundaries.map((b) => b.value);
  assert.ok(boundaryVals.includes(5), 'Must include exact min');
  assert.ok(boundaryVals.includes(4), 'Must include min - 1');
  assert.ok(boundaryVals.includes(100), 'Must include exact max');
  assert.ok(boundaryVals.includes(101), 'Must include max + 1');
  assert.ok(boundaryVals.includes(2147483647), 'Must include 32-bit INT_MAX');

  const confusions = generateTypeConfusionValues('integer', { endpointId: 'ep_test' });
  assert.ok(confusions.some((c) => Array.isArray(c.value)), 'Must inject array where integer expected');
  assert.ok(confusions.some((c) => c.value === null), 'Must inject null where integer expected');
  console.log('  ✔ Boundary values & type confusion mutators verified');

  // --------------------------------------------------------------------------
  // Test 4: Adversarial Security Mutator (Contribution 134)
  // --------------------------------------------------------------------------
  console.log('▶ Test 4: Verifying Adversarial Security Mutator...');
  const advPayloads = generateAdversarialPayloads(postEp);
  assert.ok(advPayloads.some((p) => p.strategy === 'null_byte_injection' && typeof p.value === 'string' && p.value.includes('\u0000')));
  assert.ok(advPayloads.some((p) => p.strategy === 'sqli_adversarial' && p.value === "' OR '1'='1"));
  assert.ok(advPayloads.some((p) => p.strategy === 'xss_adversarial' && typeof p.value === 'string' && p.value.includes('<script>')));
  assert.ok(advPayloads.some((p) => p.strategy === 'auth_tampering' && p.headers?.Authorization));
  console.log('  ✔ SQLi, XSS, null byte, and auth tampering vectors verified');

  // --------------------------------------------------------------------------
  // Test 5: Safe HTTP Fuzzing Executor & Concurrency Pool (Contribution 135)
  // --------------------------------------------------------------------------
  console.log('▶ Test 5: Verifying HTTP Fuzzing Executor & Concurrency Pool...');
  const { url } = buildRequestUrl('http://localhost:3000', postEp.path, postEp.parameters, {
    id: 'p1',
    strategy: 'boundary_values',
    endpointId: postEp.id,
    targetParameter: 'orderId',
    value: 'ord_99',
    description: 'Test',
  });
  assert.ok(url.includes('ord_99'));

  let activeRequests = 0;
  let maxActive = 0;
  const mockFetch = async () => {
    activeRequests++;
    if (activeRequests > maxActive) maxActive = activeRequests;
    await new Promise((r) => setTimeout(r, 10));
    activeRequests--;
    return {
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: async () => '{"status":"ok"}',
    };
  };

  const executor = new FuzzExecutor({
    baseUrl: 'http://localhost:3000',
    concurrencyLimit: 2,
    fetchFn: mockFetch,
  });

  const batchPayloads = [1, 2, 3, 4].map((i) => ({
    id: `b_${i}`,
    strategy: 'boundary_values',
    endpointId: postEp.id,
    value: i,
    description: `Batch ${i}`,
  }));

  const results = await executor.executeBatch(postEp, batchPayloads);
  assert.equal(results.length, 4);
  assert.ok(maxActive <= 2, 'Must not exceed concurrency pool limit');
  console.log('  ✔ HTTP fuzz executor & concurrency pool verified');

  // --------------------------------------------------------------------------
  // Test 6: Anomaly Classifier & Reproducible cURL (Contribution 136)
  // --------------------------------------------------------------------------
  console.log('▶ Test 6: Verifying Anomaly Classifier & cURL reproducer...');
  const errorResult = {
    id: 'res_err',
    fuzzPayload: {
      id: 'pl_null',
      strategy: 'null_byte_injection',
      endpointId: postEp.id,
      value: 'item\u0000test',
      description: 'Null byte injection',
    },
    endpointId: postEp.id,
    request: {
      url: 'http://localhost:3000/api/v1/orders/101',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      bodyPreview: '{"sku": "item\\u0000test"}',
    },
    response: {
      statusCode: 500,
      statusText: 'Internal Server Error',
      headers: {},
      bodySnippet: 'TypeError: Uncaught database exception\n  at Object.query (node_modules/pg/client.js:10:5)',
      responseTimeMs: 35,
    },
    timestamp: new Date().toISOString(),
  };

  const anomaly = classifyAnomaly(postEp, errorResult);
  assert.ok(anomaly);
  assert.equal(anomaly.severity, 'critical');
  assert.equal(anomaly.category, 'information_disclosure');
  assert.equal(anomaly.cweId, 'CWE-209');

  const curl = generateCurlReproducer('POST', 'http://localhost:3000/api/v1/orders/101', { 'Content-Type': 'application/json' }, '{"sku":"test"}');
  assert.ok(curl.startsWith('curl -X POST'));
  console.log('  ✔ Anomaly classifier and curl reproducer verified');

  // --------------------------------------------------------------------------
  // Test 7: Route Sniffer & Spec Auto-Synthesizer (Contribution 137)
  // --------------------------------------------------------------------------
  console.log('▶ Test 7: Verifying Next.js Route Sniffer & Spec Synthesizer...');
  const projectEndpoints = sniffNextJsRoutes(process.cwd());
  assert.ok(projectEndpoints.length > 5, 'Must discover project API endpoints');

  const synthesizedSpec = synthesizeOpenApiSpec(projectEndpoints, 'PROOFix Master Spec');
  assert.equal(synthesizedSpec.openapi, '3.0.3');
  assert.ok(Object.keys(synthesizedSpec.paths).length > 5);
  console.log(`  ✔ Next.js route sniffer discovered ${projectEndpoints.length} endpoints`);

  // --------------------------------------------------------------------------
  // Test 8: Fuzzing Audit Orchestrator Service (Contribution 138)
  // --------------------------------------------------------------------------
  console.log('▶ Test 8: Verifying Full Audit Orchestrator Service...');
  const auditReport = await runApiFuzzingAudit({
    runId: 'ci_audit_run_master',
    targetBaseUrl: 'http://localhost:3000',
    specInput: sampleSpec,
    fetchFn: async (reqUrl) => {
      if (reqUrl.includes('\u0000') || reqUrl.includes('%00')) {
        return {
          status: 500,
          statusText: 'Internal Error',
          headers: new Map(),
          text: async () => '{"error": "null byte failure"}',
        };
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: async () => '{"ok": true}',
      };
    },
    config: {
      maxRequestsPerEndpoint: 12,
      enabledStrategies: ['boundary_values', 'null_byte_injection'],
    },
  });

  assert.equal(auditReport.runId, 'ci_audit_run_master');
  assert.ok(auditReport.summary.totalRequestsExecuted > 0);
  assert.ok(auditReport.anomalies.length > 0, 'Must capture null byte anomaly');
  assert.ok(auditReport.summary.contractHealthScore < 100);
  console.log(`  ✔ Audit orchestrator completed (${auditReport.summary.totalRequestsExecuted} reqs, score: ${auditReport.summary.contractHealthScore}%)`);

  // --------------------------------------------------------------------------
  // Test 9: UI Component & Page Integration (Contribution 139)
  // --------------------------------------------------------------------------
  console.log('▶ Test 9: Verifying Dashboard UI Component & Tab Integration...');
  const uiSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/fuzzing/ApiFuzzingReport.tsx'), 'utf8');
  assert.ok(uiSrc.includes('export function ApiFuzzingReportView'));
  assert.ok(uiSrc.includes('contractHealthScore'));

  const pageSrc = fs.readFileSync(path.resolve(__dirname, '../src/app/projects/[id]/runs/[runId]/page.tsx'), 'utf8');
  assert.ok(pageSrc.includes('ApiFuzzingReportView'));
  assert.ok(pageSrc.includes("activeTab === 'api-fuzzing'"));
  assert.ok(pageSrc.includes('API Fuzzing & Contracts'));
  console.log('  ✔ UI component and page integration verified');

  // --------------------------------------------------------------------------
  // Test 10: Documentation Coverage (Contribution 140)
  // --------------------------------------------------------------------------
  console.log('▶ Test 10: Verifying API Fuzzing Architecture Documentation...');
  const docsPath = path.resolve(__dirname, '../docs/API_FUZZING_AND_CONTRACT_TESTING.md');
  assert.ok(fs.existsSync(docsPath), 'docs/API_FUZZING_AND_CONTRACT_TESTING.md must exist');

  const docsContent = fs.readFileSync(docsPath, 'utf8');
  assert.ok(docsContent.includes('API Fuzzing & Contract Boundary Testing'));
  assert.ok(docsContent.includes('Mutation Strategies'));
  assert.ok(docsContent.includes('Anomaly Classifier'));
  console.log('  ✔ Architecture documentation verified');

  console.log('\n================================================================');
  console.log(' 🎉 ALL 10/10 API FUZZING CI CHECKS PASSED SUCCESSFULLY!        ');
  console.log(' Point 4 / Contributions 131–140 100% Verified                  ');
  console.log('================================================================');
}

runMasterApiFuzzingSuite().catch((err) => {
  console.error('\n❌ API Fuzzing CI Suite failed:', err);
  process.exit(1);
});
