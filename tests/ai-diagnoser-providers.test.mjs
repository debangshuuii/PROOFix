import assert from 'assert';
import { LlmJsonExtractor } from '../src/lib/ai/llm-json-extractor.ts';
import { callAnthropicDiagnosis } from '../src/lib/ai/anthropic-diagnoser.ts';
import { callLocalAiDiagnosis } from '../src/lib/ai/local-ai-diagnoser.ts';
import { DiagnosisPromptBuilder } from '../src/lib/ai/prompt-builder.ts';
import { diagnoseFailure, generateDeterministicFinding } from '../src/lib/ai/diagnoser.ts';

console.log('===========================================================');
console.log('PROOFix AI Multi-Provider Diagnoser & JSON Extractor Suite');
console.log('===========================================================\n');

async function runTests() {
  // Test 1: LlmJsonExtractor Strategies
  console.log('[TEST 1] LLM JSON Extraction Strategies');
  
  // Strategy 1: Direct JSON
  const direct = LlmJsonExtractor.extract('{"severity":"high","confidenceScore":90}');
  assert.strictEqual(direct.success, true);
  assert.strictEqual(direct.extractorStrategyUsed, 'direct');
  assert.strictEqual(direct.data.severity, 'high');

  // Strategy 2: Markdown fence with trailing comma
  const markdownFenced = `Here is your JSON response:
\`\`\`json
{
  "severity": "critical",
  "title": "Backend 500 Crash",
  "affectedFiles": ["src/app/api/data/route.ts",],
  "confidenceScore": 95,
}
\`\`\`
Let me know if you need any adjustments.`;
  const fencedRes = LlmJsonExtractor.extract(markdownFenced);
  assert.strictEqual(fencedRes.success, true);
  assert.strictEqual(fencedRes.extractorStrategyUsed, 'markdown_fence');
  assert.strictEqual(fencedRes.data.title, 'Backend 500 Crash');
  assert.strictEqual(fencedRes.data.affectedFiles.length, 1);

  // Strategy 3: Balanced Brace Extractor
  const conversational = `I observed that navigation failed. The root cause is:
{"severity": "medium", "title": "Missing Route", "confidenceScore": 85}
Check back soon.`;
  const balancedRes = LlmJsonExtractor.extract(conversational);
  assert.strictEqual(balancedRes.success, true);
  assert.strictEqual(balancedRes.data.title, 'Missing Route');

  console.log('  ✓ Resilient JSON extraction succeeded across direct, markdown fence, and balanced braces.');

  // Test 2: DiagnosisPromptBuilder Token Budgeting
  console.log('[TEST 2] Prompt Context Builder with Token Budgeting');
  const mockContext = {
    runId: 'run_test_01',
    testId: 't1',
    testName: 'Broken Checkout Button',
    failureCategory: 'user_flow',
    actualResult: 'Element button#checkout not clickable',
    framework: 'Next.js',
    runtime: 'Node.js v24.x',
    redactedTokensCount: 0,
    consoleErrors: [
      { type: 'error', text: 'Error in payment listener', location: 'checkout.tsx:42' },
    ],
    networkFailures: [
      { url: 'http://localhost:3000/api/pay', method: 'POST', status: 500 },
    ],
    sourceSnippets: [
      { filePath: 'src/checkout.tsx', startLine: 1, endLine: 30, content: 'export function Checkout() {}', isTargetComponent: true },
    ],
  };

  const promptResult = DiagnosisPromptBuilder.buildPrompt(mockContext, 500);
  assert.ok(promptResult.systemPrompt.includes('PROOFix AI Failure Diagnoser'));
  assert.ok(promptResult.userPrompt.includes('Broken Checkout Button'));
  assert.ok(promptResult.estimatedTokens <= 1000);
  console.log('  ✓ Prompt builder prioritized failure signature within token budget.');

  // Test 3: Anthropic Diagnoser with Mock Fetch
  console.log('[TEST 3] Anthropic Claude Diagnoser Dispatch');
  const mockAnthropicFetch = async (url, init) => {
    assert.ok(url.includes('api.anthropic.com/v1/messages'));
    assert.strictEqual(init.headers['x-api-key'], 'ant-test-key');
    assert.strictEqual(init.headers['anthropic-version'], '2023-06-01');

    return {
      ok: true,
      json: async () => ({
        content: [
          {
            text: JSON.stringify({
              severity: 'high',
              title: 'Broken Checkout Target',
              description: 'Button event target was null',
              observedEvidence: 'Button failed click event',
              aiHypothesis: 'Target handler lacked null check',
              suggestedFix: 'Add optional chaining',
              patchPreview: '--- a/src/btn.tsx\n+++ b/src/btn.tsx\n@@ -1 +1 @@\n-x.click()\n+x?.click()',
              affectedFiles: ['src/btn.tsx'],
              confidenceScore: 92,
            }),
          },
        ],
      }),
    };
  };

  const mockTestResult = {
    id: 'res_01',
    runId: 'run_test_01',
    name: 'Checkout Flow',
    category: 'user_flow',
    status: 'failed',
    durationMs: 500,
    actualResult: 'Button failed click event',
    evidence: {
      consoleErrors: [],
      networkFailures: [],
      steps: [],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  const claudeFinding = await callAnthropicDiagnosis({
    runId: 'run_test_01',
    testResult: mockTestResult,
    config: {
      apiKey: 'ant-test-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1000,
      temperature: 0.1,
    },
    fetchImpl: mockAnthropicFetch,
  });

  assert.strictEqual(claudeFinding.severity, 'high');
  assert.strictEqual(claudeFinding.title, 'Broken Checkout Target');
  assert.strictEqual(claudeFinding.confidenceScore, 92);
  console.log('  ✓ Anthropic Claude diagnoser formatted valid finding.');

  // Test 4: Local Air-Gapped AI Diagnoser with Mock Fetch
  console.log('[TEST 4] Local Air-Gapped AI Diagnoser (Ollama / vLLM)');
  const mockLocalFetch = async (url, init) => {
    assert.ok(url.includes('11434/v1/chat/completions'));
    const body = JSON.parse(init.body);
    assert.strictEqual(body.model, 'llama3.2:latest');

    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"severity":"critical","title":"Air-Gapped Llama Crash","confidenceScore":88,"affectedFiles":["src/main.ts"]}\n```',
            },
          },
        ],
      }),
    };
  };

  const localFinding = await callLocalAiDiagnosis({
    runId: 'run_test_01',
    testResult: mockTestResult,
    config: {
      baseUrl: 'http://localhost:11434/v1',
      modelName: 'llama3.2:latest',
      timeoutMs: 5000,
      temperature: 0.1,
    },
    fetchImpl: mockLocalFetch,
  });

  assert.strictEqual(localFinding.severity, 'critical');
  assert.strictEqual(localFinding.title, 'Air-Gapped Llama Crash');
  console.log('  ✓ Local AI diagnoser succeeded with markdown-fenced response.');

  // Test 5: Fallback Cascade to Deterministic Rule Engine
  console.log('[TEST 5] Diagnoser Fallback Cascade to Offline Deterministic Engine');
  const fallbackResult = await diagnoseFailure({
    runId: 'run_test_01',
    testResult: {
      ...mockTestResult,
      failureCategory: 'navigation_failed',
      actualResult: 'HTTP 404 at /missing-route',
      errorDetails: { url: 'http://localhost:3000/missing-route', stepFailed: 'Navigate' },
    },
    settings: {
      aiProvider: 'offline',
      sandboxMemoryLimitMb: 512,
      sandboxTimeoutSecs: 30,
      allowOutboundNetwork: false,
    },
  });

  assert.strictEqual(fallbackResult.severity, 'high');
  assert.ok(fallbackResult.title.includes('404 Not Found'));
  assert.ok(fallbackResult.suggestedFix.includes('routing configuration'));
  console.log('  ✓ Fallback cascade generated deterministic grounded finding.');

  console.log('===========================================================');
  console.log('ALL 5 AI MULTI-PROVIDER DIAGNOSER TESTS PASSED!');
  console.log('===========================================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
