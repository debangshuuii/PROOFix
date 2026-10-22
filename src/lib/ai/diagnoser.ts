import { TestResult, Finding, SystemSettings } from '../types/index.ts';
import type { StructuredDiagnosisPayload } from '../types/ai-diagnosis.ts';
import { LlmJsonExtractor } from './llm-json-extractor.ts';
import { callAnthropicDiagnosis } from './anthropic-diagnoser.ts';
import { callLocalAiDiagnosis } from './local-ai-diagnoser.ts';

export interface DiagnosisRequest {
  runId: string;
  testResult: TestResult;
  projectStack?: string;
  settings: SystemSettings;
  mockFetch?: typeof fetch;
}

export async function diagnoseFailure(request: DiagnosisRequest): Promise<Finding> {
  const { runId, testResult, projectStack = 'Next.js', settings, mockFetch } = request;
  const fetchImpl = mockFetch || fetch;

  // 1. Anthropic Claude Diagnosis
  if (settings.aiProvider === 'anthropic' && settings.anthropicApiKey) {
    try {
      return await callAnthropicDiagnosis({
        runId,
        testResult,
        config: {
          apiKey: settings.anthropicApiKey,
          model: settings.anthropicModel || 'claude-3-5-sonnet-20241022',
          maxTokens: 2500,
          temperature: 0.1,
        },
        fetchImpl,
      });
    } catch (err: any) {
      console.warn('Anthropic diagnosis failed, attempting provider fallback:', err.message);
    }
  }

  // 2. Google Gemini Diagnosis
  if (settings.aiProvider === 'gemini' && settings.geminiApiKey) {
    try {
      return await callGeminiDiagnosis(request, fetchImpl);
    } catch (err: any) {
      console.warn('Gemini diagnosis failed, attempting provider fallback:', err.message);
    }
  }

  // 3. OpenAI Diagnosis
  if (settings.aiProvider === 'openai' && settings.openaiApiKey) {
    try {
      return await callOpenAIDiagnosis(request, fetchImpl);
    } catch (err: any) {
      console.warn('OpenAI diagnosis failed, attempting provider fallback:', err.message);
    }
  }

  // 4. Local Air-Gapped AI (Ollama / vLLM)
  if (settings.aiProvider === ('local_ollama' as any) || settings.aiProvider === ('local_vllm' as any)) {
    try {
      return await callLocalAiDiagnosis({
        runId,
        testResult,
        config: {
          baseUrl: settings.localAiBaseUrl || 'http://localhost:11434/v1',
          modelName: settings.localAiModel || 'llama3.2:latest',
          timeoutMs: 30000,
          temperature: 0.1,
        },
        fetchImpl,
      });
    } catch (err: any) {
      console.warn('Local AI diagnosis failed, falling back to deterministic rule engine:', err.message);
    }
  }

  // 5. Built-in Deterministic Rule-Based Evidence Diagnoser (Zero-Dependency Offline Fallback)
  // This engine inspects the actual observed evidence (status, URL, error message, console logs)
  // and generates factual, reliable diagnoses without hallucinations.
  return generateDeterministicFinding(runId, testResult, projectStack);
}

export function generateDeterministicFinding(
  runId: string,
  test: TestResult,
  projectStack: string
): Finding {
  const findingId = `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 1. Navigation / 404 Failure
  if (test.failureCategory === 'navigation_failed' || test.actualResult.includes('404')) {
    const brokenUrl = test.errorDetails?.url || 'target link';
    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'high',
      title: `Broken Navigation Target: 404 Not Found (${test.name})`,
      description: `The application attempted to navigate to "${brokenUrl}", but the server returned HTTP 404 (Not Found).`,
      observedEvidence: `Observed HTTP 404 status on navigation request to ${brokenUrl}. Step failed: "${test.errorDetails?.stepFailed || 'Navigate'}".`,
      aiHypothesis: `Probable causes: (1) Typo in the link's href attribute, (2) The corresponding route file was deleted or moved, or (3) Dynamic route parameters were not matched in the router manifest.`,
      suggestedFix: `Inspect navigation components and verify that the target URL corresponds to an existing page file or rewrite rule in your routing configuration.`,
      patchPreview: `--- a/src/components/Navigation.tsx
+++ b/src/components/Navigation.tsx
@@ -10,3 +10,3 @@
-<Link href="/broken-route">Dead Link</Link>
+<Link href="/">Valid Target</Link>`,
      affectedFiles: ['src/components/Navigation.tsx', 'src/app/page.tsx'],
      sideEffects: 'Redirects user to an active route instead of displaying a 404 error page.',
      verificationStep: 'Re-run PROOFix Dead Link Audit to confirm HTTP 200 resolution.',
      confidenceScore: 94,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // 2. HTTP 500 / API Endpoint Failure
  if (test.failureCategory === 'http_error' || test.actualResult.includes('500')) {
    const apiUrl = test.errorDetails?.url || '/api endpoint';
    const detail = test.errorDetails?.message || test.actualResult;

    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'critical',
      title: `Backend API Crash (HTTP 500) on ${apiUrl}`,
      description: `The backend route handler crashed or rejected the incoming HTTP request.`,
      observedEvidence: `Observed HTTP 500 status returned by ${apiUrl}. Details: "${detail}".`,
      aiHypothesis: `Probable causes: (1) An unhandled database exception (e.g. missing DATABASE_URL or unreachable host), (2) Missing required environment variables, or (3) An uncaught asynchronous rejection in the API route handler.`,
      suggestedFix: `Wrap backend route execution in a try-catch block, validate database client connectivity prior to query execution, and return a clean HTTP 503 or fallback response with structured error messages.`,
      patchPreview: `--- a/src/app/api/data/route.ts
+++ b/src/app/api/data/route.ts
@@ -5,3 +5,8 @@
-  const result = await db.query();
-  return Response.json(result);
+  try {
+    const result = await db.query();
+    return Response.json(result);
+  } catch (error: any) {
+    console.error('API Error:', error.message);
+    return Response.json({ error: 'Service Unavailable', details: error.message }, { status: 503 });
+  }`,
      affectedFiles: ['src/app/api/data/route.ts'],
      sideEffects: 'Prevents unhandled process crashes; returns structured error response to frontend clients.',
      verificationStep: 'Re-run PROOFix API Health Check to verify proper HTTP handling.',
      confidenceScore: 92,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // 3. Uncaught JavaScript Exception
  if (test.failureCategory === 'uncaught_js_exception' || test.evidence.consoleErrors.some((e) => e.type === 'exception')) {
    const exceptionText = test.evidence.consoleErrors.find((e) => e.type === 'exception')?.text || test.actualResult;
    const location = test.evidence.consoleErrors.find((e) => e.type === 'exception')?.location || 'Unknown component';

    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'critical',
      title: `Uncaught Client-Side Exception in ${location}`,
      description: `A JavaScript runtime exception caused rendering to abort or triggered an error boundary.`,
      observedEvidence: `Browser captured uncaught error: "${exceptionText}" at ${location}.`,
      aiHypothesis: `Probable causes: (1) Null or undefined property dereference during component mounting, (2) Failure to check API response structure before accessing nested properties, or (3) Server-Side Rendering hydration mismatch.`,
      suggestedFix: `Use optional chaining (e.g. data?.user?.name) and provide explicit fallback states for asynchronous data. Implement React Error Boundaries around volatile components.`,
      patchPreview: `--- a/src/components/UserProfile.tsx
+++ b/src/components/UserProfile.tsx
@@ -12,3 +12,3 @@
-<span>{profile.user.displayName}</span>
+<span>{profile?.user?.displayName || 'Anonymous Guest'}</span>`,
      affectedFiles: ['src/components/UserProfile.tsx', 'src/app/page.tsx'],
      sideEffects: 'Prevents blank white-screen crashes when profile data is incomplete.',
      verificationStep: 'Re-run PROOFix User Flow suite to verify smooth rendering.',
      confidenceScore: 95,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // 4. Responsive Layout Overflow
  if (test.failureCategory === 'layout_overflow') {
    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'medium',
      title: `Horizontal Scroll Overflow on Viewport`,
      description: `DOM elements exceed the viewport width, creating unintended horizontal scrolling.`,
      observedEvidence: test.actualResult,
      aiHypothesis: `Probable causes: (1) Hardcoded pixel widths (e.g. w-[600px]) on containers without max-width constraints, or (2) Unwrapped pre/code blocks with long lines.`,
      suggestedFix: `Apply max-w-full and overflow-x-hidden to outer wrappers, and use relative flex or grid widths.`,
      affectedFiles: ['src/app/globals.css', 'src/app/page.tsx'],
      confidenceScore: 88,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // 5. Default General Failure Diagnosis
  return {
    id: findingId,
    runId,
    testResultId: test.id,
    severity: 'medium',
    title: `Verification Failure: ${test.name}`,
    description: test.actualResult,
    observedEvidence: `Step failed: "${test.errorDetails?.stepFailed || 'Execution'}". Error message: ${test.errorDetails?.message || 'Check failed'}.`,
    aiHypothesis: `The application violated an expected condition during browser verification.`,
    suggestedFix: `Review the test step logs, inspect the captured screenshot, and ensure the tested component returns expected status codes.`,
    confidenceScore: 80,
    reviewStatus: 'pending',
    createdAt: now,
  };
}

async function callGeminiDiagnosis(
  request: DiagnosisRequest,
  fetchImpl: typeof fetch
): Promise<Finding> {
  const { runId, testResult, settings } = request;
  const apiKey = settings.geminiApiKey;

  const prompt = `You are PROOFix AI Failure Diagnoser.
Analyze the following test failure evidence and output a strictly formatted JSON response.
Do NOT hallucinate facts; only use the provided evidence.

TEST NAME: ${testResult.name}
CATEGORY: ${testResult.category}
ACTUAL RESULT: ${testResult.actualResult}
ERROR DETAILS: ${JSON.stringify(testResult.errorDetails || {})}
CONSOLE ERRORS: ${JSON.stringify(testResult.evidence.consoleErrors || [])}
NETWORK FAILURES: ${JSON.stringify(testResult.evidence.networkFailures || [])}

Provide your analysis in JSON with these keys:
{
  "severity": "critical" | "high" | "medium" | "low",
  "title": string,
  "description": string,
  "observedEvidence": string (strictly what happened in the test),
  "aiHypothesis": string (probabilistic root cause),
  "suggestedFix": string (step-by-step instructions),
  "patchPreview": string (unified diff format --- a/... +++ b/...),
  "affectedFiles": string[],
  "sideEffects": string,
  "verificationStep": string,
  "confidenceScore": number (0 to 100)
}`;

  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const json = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

  // Use resilient JSON extraction to defend against markdown fences
  const extraction = LlmJsonExtractor.extract<StructuredDiagnosisPayload>(rawText);
  if (!extraction.success || !extraction.data) {
    throw new Error(`Failed to extract valid JSON from Gemini output: ${extraction.parseError}`);
  }

  const parsed = extraction.data;

  return {
    id: `fnd_gemini_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    runId,
    testResultId: testResult.id,
    severity: parsed.severity || 'high',
    title: parsed.title,
    description: parsed.description,
    observedEvidence: parsed.observedEvidence,
    aiHypothesis: parsed.aiHypothesis,
    suggestedFix: parsed.suggestedFix,
    patchPreview: parsed.patchPreview,
    affectedFiles: parsed.affectedFiles,
    sideEffects: parsed.sideEffects,
    verificationStep: parsed.verificationStep,
    confidenceScore: parsed.confidenceScore || 85,
    reviewStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}

async function callOpenAIDiagnosis(
  request: DiagnosisRequest,
  fetchImpl: typeof fetch
): Promise<Finding> {
  const { runId, testResult, settings } = request;
  const apiKey = settings.openaiApiKey;

  const prompt = `Analyze this test failure and output JSON matching the Finding schema.
TEST: ${testResult.name}
ACTUAL: ${testResult.actualResult}
ERROR: ${JSON.stringify(testResult.errorDetails || {})}
CONSOLE: ${JSON.stringify(testResult.evidence.consoleErrors || [])}`;

  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert software verification diagnoser. Output valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;

  // Use resilient JSON extraction to handle formatting variances
  const extraction = LlmJsonExtractor.extract<StructuredDiagnosisPayload>(content);
  if (!extraction.success || !extraction.data) {
    throw new Error(`Failed to extract valid JSON from OpenAI output: ${extraction.parseError}`);
  }

  const parsed = extraction.data;

  return {
    id: `fnd_openai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    runId,
    testResultId: testResult.id,
    severity: parsed.severity || 'high',
    title: parsed.title,
    description: parsed.description,
    observedEvidence: parsed.observedEvidence,
    aiHypothesis: parsed.aiHypothesis,
    suggestedFix: parsed.suggestedFix,
    patchPreview: parsed.patchPreview,
    affectedFiles: parsed.affectedFiles,
    sideEffects: parsed.sideEffects,
    verificationStep: parsed.verificationStep,
    confidenceScore: parsed.confidenceScore || 85,
    reviewStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}
