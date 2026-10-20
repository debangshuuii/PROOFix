import assert from 'node:assert/strict';
import path from 'path';
import {
  extractWorkspacePathsFromStackTrace,
  extractCodeSnippet,
  inferCandidateRouteFiles,
  synthesizeFailureContext,
} from '../src/lib/repair/context-synthesizer.ts';

console.log('--- Testing Failure Context Synthesizer & Target Extractor (Contribution 2 / 102) ---');

function testStackTraceExtraction() {
  const workspaceRoot = 'd:/Coding/PROOFix';
  const stack = `
Error: Uncaught TypeError: Cannot read properties of undefined
    at calculateTotal (d:\\Coding\\PROOFix\\src\\app\\checkout\\page.tsx:42:15)
    at onClick (d:\\Coding\\PROOFix\\src\\components\\Button.tsx:18:9)
    at HTMLButtonElement.dispatch (d:\\Coding\\PROOFix\\node_modules\\react-dom\\cjs\\react-dom.js:1234:20)
    at runMicrotasks (<anonymous>)
  `;

  const matches = extractWorkspacePathsFromStackTrace(stack, workspaceRoot);
  assert.equal(matches.length, 2, 'Should match checkout page and Button component, excluding node_modules');
  assert.equal(matches[0].filePath, 'src/app/checkout/page.tsx');
  assert.equal(matches[0].line, 42);
  assert.equal(matches[1].filePath, 'src/components/Button.tsx');
  assert.equal(matches[1].line, 18);

  console.log('[PASS] Stack trace parser identifies repository-internal files and filters out dependencies.');
}

function testCodeSnippetExtraction() {
  const sampleCode = `line 1
line 2
line 3
target line 4
line 5
line 6
line 7`;

  const snippet = extractCodeSnippet(sampleCode, 4, 2);
  assert.ok(snippet.includes('>    4 | target line 4'));
  assert.ok(snippet.includes('   2 | line 2'));
  assert.ok(snippet.includes('   6 | line 6'));
  assert.equal(snippet.includes('line 1'), false);

  console.log('[PASS] Code snippet windowing correctly highlights target failure line.');
}

function testCandidateRouteInference() {
  const workspace = process.cwd();

  const apiCandidates = inferCandidateRouteFiles('/api/items', workspace);
  assert.ok(apiCandidates.some((c) => c.includes('api/items')));

  const pageCandidates = inferCandidateRouteFiles('/dashboard/settings', workspace);
  assert.ok(pageCandidates.some((c) => c.includes('dashboard/settings')));

  console.log('[PASS] Next.js route file mapping accurately resolves candidate file targets.');
}

function testContextSynthesisWithSecretRedaction() {
  const fakeSecret = 'ghp_SampleSecretToken1234567890';
  const testResult = {
    id: 'test_res_checkout_fail',
    runId: 'run_sample_100',
    name: 'Checkout Flow Verification',
    category: 'user_flow',
    status: 'failed',
    durationMs: 450,
    actualResult: `Database error with auth ${fakeSecret} at checkout`,
    errorDetails: {
      message: `Database error with auth ${fakeSecret} at checkout`,
      stack: `Error: fail with key ${fakeSecret}\n    at d:\\Coding\\PROOFix\\src\\lib\\types\\index.ts:12:4`,
      url: 'https://app.proofix.dev/checkout',
    },
    evidence: {
      consoleErrors: [{ timestamp: new Date().toISOString(), type: 'error', text: `Key leaked: ${fakeSecret}` }],
      networkFailures: [{ url: `/api/pay?token=${fakeSecret}`, method: 'POST', status: 500 }],
      steps: [],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  const context = synthesizeFailureContext(testResult, process.cwd());
  assert.equal(context.failureId, 'test_res_checkout_fail');
  assert.equal(context.errorMessage.includes(fakeSecret), false);
  assert.ok(context.errorMessage.includes('[REDACTED_SECRET]') || !context.errorMessage.includes(fakeSecret));
  assert.equal(context.sanitizedStackTrace.includes(fakeSecret), false);
  assert.equal(context.consoleErrors[0].includes(fakeSecret), false);
  assert.equal(context.networkErrors[0].includes(fakeSecret), false);

  console.log('[PASS] Context synthesis extracts complete diagnostics and guarantees zero secret leakage.');
}

function runSuite() {
  testStackTraceExtraction();
  testCodeSnippetExtraction();
  testCandidateRouteInference();
  testContextSynthesisWithSecretRedaction();
  console.log('[ALL PASS] Contribution 2 (102) test suite passed.');
}

runSuite();
