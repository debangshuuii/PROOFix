import { NextResponse } from 'next/server';
import { runApiFuzzingAudit } from '@/lib/fuzzing/fuzz-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { runId, targetBaseUrl, specInput, config } = body;

    const report = await runApiFuzzingAudit({
      runId: runId || `run_fuzz_${Date.now()}`,
      targetBaseUrl: targetBaseUrl || 'http://localhost:3000',
      specInput,
      config,
    });

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      { error: `API Fuzzing failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId') || 'run_sample_fuzz';

  // Return a sample audit demonstration report
  const sampleReport = {
    id: `rep_fuzz_${runId}`,
    runId,
    targetBaseUrl: 'http://localhost:3000',
    specTitle: 'Next.js Auto-Sniffed App Routes',
    specVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    config: {
      targetBaseUrl: 'http://localhost:3000',
      maxRequestsPerEndpoint: 20,
      concurrencyLimit: 4,
      timeoutMs: 5000,
      enabledStrategies: ['boundary_values', 'type_confusion', 'null_byte_injection', 'sqli_adversarial'],
      detectDataLeaks: true,
      detectStackTraces: true,
      rateLimitThresholdMs: 2500,
    },
    summary: {
      totalEndpointsFuzzed: 12,
      totalRequestsExecuted: 148,
      totalAnomaliesDetected: 3,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
      infoCount: 0,
      durationMs: 420,
      contractHealthScore: 78,
    },
    endpoints: [
      {
        id: 'ep_get_api_v1_runs_id_live',
        path: '/api/v1/runs/{id}/live',
        method: 'GET',
        summary: 'GET /api/v1/runs/{id}/live',
        parameters: [{ in: 'path', name: 'id', required: true, type: 'string' }],
        responses: { '200': { statusCode: '200' } },
      },
      {
        id: 'ep_post_api_v1_runs_id_control',
        path: '/api/v1/runs/{id}/control',
        method: 'POST',
        summary: 'POST /api/v1/runs/{id}/control',
        parameters: [{ in: 'path', name: 'id', required: true, type: 'string' }],
        requestBody: { contentType: 'application/json', required: true, schema: { type: 'object' } },
        responses: { '200': { statusCode: '200' } },
      },
    ],
    anomalies: [
      {
        id: 'anom_sample_1',
        endpointId: 'ep_post_api_v1_runs_id_control',
        endpointPath: '/api/v1/runs/{id}/control',
        method: 'POST',
        severity: 'critical',
        category: 'unhandled_server_exception',
        title: '500 Server Exception on Null Byte Payload in Action',
        description: 'Server threw an uncaught error when processing action with embedded \\u0000 byte.',
        fuzzStrategy: 'null_byte_injection',
        fuzzPayloadSnippet: '{"action": "pause\\u0000test"}',
        reproducingRequest: {
          method: 'POST',
          url: 'http://localhost:3000/api/v1/runs/sample_run/control',
          headers: { 'Content-Type': 'application/json' },
          body: { action: 'pause\u0000test' },
          curlCommand: 'curl -X POST "http://localhost:3000/api/v1/runs/sample_run/control" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"action": "pause\\u0000test"}\'',
        },
        observedResponse: {
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          bodySnippet: '{"error": "invalid byte sequence for encoding \\"UTF8\\": 0x00"}',
          responseTimeMs: 38,
        },
        remediationRecommendation: 'Sanitize null bytes from action parameter in control handler.',
        cweId: 'CWE-20',
      },
      {
        id: 'anom_sample_2',
        endpointId: 'ep_post_api_v1_runs_id_control',
        endpointPath: '/api/v1/runs/{id}/control',
        method: 'POST',
        severity: 'high',
        category: 'security_validation_bypass',
        title: 'Unvalidated Acceptance of SQL Injection Payload',
        description: 'Endpoint accepted raw SQL tautology "\' OR \'1\'=\'1" with HTTP 200.',
        fuzzStrategy: 'sqli_adversarial',
        fuzzPayloadSnippet: '{"action": "\' OR \'1\'=\'1"}',
        reproducingRequest: {
          method: 'POST',
          url: 'http://localhost:3000/api/v1/runs/sample_run/control',
          headers: { 'Content-Type': 'application/json' },
          body: { action: "' OR '1'='1" },
          curlCommand: 'curl -X POST "http://localhost:3000/api/v1/runs/sample_run/control" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"action": "\' OR \'1\'=\'1"}\'',
        },
        observedResponse: {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          bodySnippet: '{"state": "idle"}',
          responseTimeMs: 22,
        },
        remediationRecommendation: 'Validate action string against allowed enum whitelist: ["pause", "resume", "step_next", "set_breakpoint"].',
        cweId: 'CWE-20',
      },
    ],
  };

  return NextResponse.json(sampleReport);
}
