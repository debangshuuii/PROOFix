import { TestResult, Finding, SystemSettings } from '../types';

export interface DiagnosisRequest {
  runId: string;
  testResult: TestResult;
  projectStack?: string;
  settings: SystemSettings;
}

export async function diagnoseFailure(request: DiagnosisRequest): Promise<Finding> {
  const { runId, testResult, projectStack = 'Next.js', settings } = request;

  // If an external AI provider key is configured, we can query it with strict schemas
  if (settings.aiProvider === 'gemini' && settings.geminiApiKey) {
    try {
      return await callGeminiDiagnosis(request);
    } catch (err: any) {
      console.warn('Gemini diagnosis failed, falling back to deterministic rule engine:', err.message);
    }
  } else if (settings.aiProvider === 'openai' && settings.openaiApiKey) {
    try {
      return await callOpenAIDiagnosis(request);
    } catch (err: any) {
      console.warn('OpenAI diagnosis failed, falling back to deterministic rule engine:', err.message);
    }
  }

  // Built-in Deterministic Rule-Based Evidence Diagnoser (Offline Fallback)
  // This engine inspects the actual observed evidence (status, URL, error message, console logs)
  // and generates factual, reliable diagnoses without hallucinations.
  return generateDeterministicFinding(runId, testResult, projectStack);
}

function generateDeterministicFinding(
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
    const firstErr = test.evidence.consoleErrors.find((e) => e.type === 'exception') || test.evidence.consoleErrors[0];
    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'critical',
      title: `Uncaught Client-Side JavaScript Exception`,
      description: `The browser encountered an unhandled JavaScript exception during execution.`,
      observedEvidence: `Observed uncaught error: "${firstErr?.text || 'Uncaught TypeError'}". Location: ${firstErr?.location || 'unknown'}.`,
      aiHypothesis: `Probable causes: (1) Attempting to access properties or methods on an undefined object, (2) Failing to check if third-party SDKs or window globals are initialized before calling them, or (3) Missing optional chaining (?.) on nullable props.`,
      suggestedFix: `Add defensive null-checks or optional chaining (?.) before accessing nested properties, and wrap risky browser-only integrations inside React useEffect or typeof window !== 'undefined' checks.`,
      patchPreview: `--- a/src/components/ClientWidget.tsx
+++ b/src/components/ClientWidget.tsx
@@ -14,3 +14,3 @@
-  window.targetSdk.initialize();
+  if (typeof window !== 'undefined' && window.targetSdk) {
+    window.targetSdk.initialize?.();
+  }`,
      affectedFiles: ['src/components/ClientWidget.tsx'],
      sideEffects: 'Guards against fatal white-screen application crashes.',
      verificationStep: 'Re-run PROOFix Console & JS Exception Watchdog check.',
      confidenceScore: 96,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // 4. Responsive / Layout Overflow
  if (test.failureCategory === 'layout_overflow' || test.actualResult.includes('overflow')) {
    return {
      id: findingId,
      runId,
      testResultId: test.id,
      severity: 'medium',
      title: `Responsive Layout Horizontal Overflow Detected`,
      description: `The application page width exceeds the viewport width on mobile screen dimensions (375px), causing unintentional horizontal scrolling.`,
      observedEvidence: `Observed document.documentElement.scrollWidth > window.innerWidth at mobile viewport.`,
      aiHypothesis: `Probable causes: (1) Elements with fixed pixel widths (e.g., width: 600px instead of max-w-full), (2) Negative margins or unconstrained pre/code tags without overflow-x-auto, or (3) Images missing responsive max-width rules.`,
      suggestedFix: `Replace fixed pixel widths with responsive Tailwind classes (w-full, max-w-full, overflow-x-hidden, or overflow-x-auto on tables/code blocks).`,
      patchPreview: `--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -20,2 +20,4 @@
+html, body {
+  overflow-x: hidden;
+}`,
      affectedFiles: ['src/app/globals.css', 'src/app/page.tsx'],
      sideEffects: 'Eliminates unexpected horizontal scroll on mobile devices.',
      verificationStep: 'Re-run PROOFix Responsive Viewport Audit.',
      confidenceScore: 88,
      reviewStatus: 'pending',
      createdAt: now,
    };
  }

  // Generic fallback
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

async function callGeminiDiagnosis(request: DiagnosisRequest): Promise<Finding> {
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

  const response = await fetch(
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
  const parsed = JSON.parse(rawText);

  return {
    id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

async function callOpenAIDiagnosis(request: DiagnosisRequest): Promise<Finding> {
  const { runId, testResult, settings } = request;
  const apiKey = settings.openaiApiKey;

  const prompt = `Analyze this test failure and output JSON matching the Finding schema.
TEST: ${testResult.name}
ACTUAL: ${testResult.actualResult}
ERROR: ${JSON.stringify(testResult.errorDetails || {})}
CONSOLE: ${JSON.stringify(testResult.evidence.consoleErrors || [])}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  const parsed = JSON.parse(content);

  return {
    id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
