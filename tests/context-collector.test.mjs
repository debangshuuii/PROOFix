import { collectFailureContext } from '../src/lib/ai/context-collector.ts';
import assert from 'assert';

console.log('--- TEST: Failure-Context Collector & Redaction ---');

const mockFailedTest = {
  id: 'res_sample_failure_01',
  runId: 'run_sample_01',
  name: 'Navigation Broken Link Check',
  category: 'user_flow',
  status: 'failed',
  durationMs: 1200,
  actualResult: 'Failed request to /broken-route with Auth: Bearer sk-ant-api03-secret12345678901234567890',
  evidence: {
    consoleErrors: [
      {
        text: 'Uncaught Error connecting with password=SuperSecretPassword123 at src/fixtures/sample-app/src/app/page.tsx:12',
        location: 'src/fixtures/sample-app/src/app/page.tsx:12',
      },
    ],
    networkFailures: [
      {
        url: 'http://localhost:4173/broken-route?apiKey=AIzaSyA1234567890123456789012345678901',
        status: 404,
        failureReason: 'Not Found',
      },
    ],
    steps: [],
  },
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

async function run() {
  const context = await collectFailureContext({
    testResult: mockFailedTest,
    commitSha: 'd2156de8971439',
    workspaceRoot: process.cwd(),
  });

  // Verify failure ID and commit SHA
  assert.strictEqual(context.failureId, 'res_sample_failure_01');
  assert.strictEqual(context.commitSha, 'd2156de8971439');
  console.log('[PASS] Failure ID and commit SHA correctly preserved.');

  // Verify secret redaction
  assert.ok(!context.errorMessage.includes('sk-ant-api03'), 'API key must be redacted');
  assert.ok(context.errorMessage.includes('[REDACTED_SECRET]') || context.errorMessage.includes('Bearer [REDACTED_TOKEN]'));
  console.log('[PASS] Sensitive bearer token redacted from error message.');

  assert.ok(!context.consoleErrors[0].text.includes('SuperSecretPassword123'), 'Password must be redacted');
  console.log('[PASS] Sensitive password parameter redacted from console logs.');

  assert.ok(!context.networkFailures[0].url.includes('AIzaSyA'), 'Google API key must be redacted');
  console.log('[PASS] API key parameter redacted from network URL.');

  // Verify source snippets
  assert.ok(Array.isArray(context.relatedSnippets), 'Related snippets must be an array');
  assert.ok(context.relatedSnippets.length > 0, 'Should find at least 1 related source snippet');
  assert.strictEqual(context.relatedSnippets[0].filePath, 'src/fixtures/sample-app/src/app/page.tsx');
  assert.ok(context.relatedSnippets[0].content.length > 0, 'Snippet content must be non-empty');
  console.log('[PASS] Source snippet successfully located and extracted.');

  console.log('All failure-context collector tests passed successfully!\n');
}

run().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
