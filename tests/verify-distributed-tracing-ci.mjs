/**
 * PROOFix Master OpenTelemetry (OTel) Distributed Tracing CI Suite (Contribution 210)
 *
 * Validates:
 * 1. W3C Trace Context spec compliance (traceparent, tracestate)
 * 2. High-resolution monotonic span tracer and span lifecycle management
 * 3. In-memory span ring buffer and tail-based adaptive sampling
 * 4. OTLP/HTTP Protobuf/JSON protocol exporter serialization for Jaeger, Datadog, & Tempo
 * 5. Full 5-hop test lifecycle distributed tracing:
 *    [API Trigger] -> [Outbox Publisher] -> [Queue Worker] -> [Sandbox Spawn] -> [Playwright Run]
 * 6. Playwright browser context & network request W3C header injection
 * 7. OTLP collector receiver endpoint
 * 8. Tracing waterfall & flamegraph UI dashboard
 */

import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('🚀 Running PROOFix OpenTelemetry Distributed Tracing CI Suite...\n');

const testSuites = [
  'tests/otel-types.test.mjs',
  'tests/w3c-trace-context.test.mjs',
  'tests/span-tracer.test.mjs',
  'tests/span-buffer.test.mjs',
  'tests/otlp-exporter.test.mjs',
  'tests/lifecycle-tracer.test.mjs',
  'tests/playwright-trace-injector.test.mjs',
  'tests/otlp-route.test.mjs',
  'tests/trace-waterfall-ui.test.mjs',
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  process.stdout.write(`  ⏳ Running ${suite}... `);
  try {
    execSync(`node ${suite}`, { stdio: 'pipe' });
    console.log('✅ PASS');
    totalPassed++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    totalFailed++;
  }
}

console.log('\n---------------------------------------------------------');
console.log(`📊 OTel Distributed Tracing Verification Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('---------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All OpenTelemetry Distributed Tracing verification gates PASSED successfully!\n');
}
