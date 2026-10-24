/**
 * Demo Scenario 1: E-Commerce Broken Checkout & Missing Route
 *
 * Demonstrates automated detection of missing backend API routes (HTTP 404)
 * and interactive form submission failures during checkout flow.
 */

import type { DemoScenarioContract } from '../types.ts';

export const ECOMMERCE_CHECKOUT_SCENARIO: DemoScenarioContract = {
  id: 'ecommerce_checkout',
  title: 'E-Commerce Broken Checkout & Missing Route',
  subtitle: 'Order submission click hangs + backend /api/checkout returns 404',
  description:
    'Simulates an online store checkout flow. Playwright intercepts a button click handler that attempts to hit an unmapped /api/checkout endpoint, catching the HTTP 404 dead link and user-facing freeze.',
  category: 'functional_e2e',
  badge: 'Cart & API 404',
  difficulty: 'Beginner',
  tags: ['Playwright', 'Click Interaction', 'Network 404', 'Next.js App Router', 'Auto-Repair'],
  fault: {
    headline: 'Payment submission event handler fails due to missing backend API route',
    technicalSummary:
      'The "Place Order" button in CheckoutForm.tsx fires a POST request to /api/checkout. The route does not exist in the App Router directory, causing an HTTP 404 dead link and an unhandled Promise rejection in the browser.',
    faultyFile: 'src/app/checkout/CheckoutForm.tsx',
    severity: 'high',
    expectedFailure: {
      stepName: 'Submit Checkout Order Form',
      category: 'interaction',
      expectedStatus: 'failed',
      errorMessage: 'Failed to complete checkout: POST /api/checkout responded with HTTP 404 (Not Found)',
      httpStatus: 404,
      domSelector: '#place-order-btn',
      detectedStage: 'Interactive State Hydration & Click Auditing',
    },
  },
  aiDiagnosis: {
    rootCause: 'Route /api/checkout/route.ts is absent from the project file tree.',
    explanation:
      'Evidence from Playwright network telemetry demonstrates that clicking #place-order-btn dispatched a fetch request to /api/checkout, which received an immediate HTTP 404. CheckoutForm did not catch the error, leaving the UI permanently in a disabled loading state.',
    suggestedFix:
      'Create src/app/api/checkout/route.ts to handle POST requests with order ID generation and validation.',
    confidenceScore: 0.96,
  },
  fixProposal: {
    targetFile: 'src/app/api/checkout/route.ts',
    summary: 'Provision missing /api/checkout route handler and handle empty carts gracefully.',
    patchDiff: `--- /dev/null
+++ b/src/app/api/checkout/route.ts
@@ -0,0 +1,14 @@
+import { NextResponse } from 'next/server';
+
+export async function POST(req: Request) {
+  try {
+    const body = await req.json();
+    if (!body.items || body.items.length === 0) {
+      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
+    }
+    return NextResponse.json({ success: true, orderId: 'ord_demo_982341' });
+  } catch {
+    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
+  }
+}`,
  },
  benchmark: {
    detectionTimeMs: 1240,
    aiDiagnosisConfidence: 0.96,
    patchGenerationTimeMs: 410,
    verificationPassRate: 1.0,
    zeroConfigRating: '10/10 Instant',
  },
  seedProject: {
    id: 'prj-demo-ecommerce-checkout',
    ownerId: 'usr_default',
    name: 'NextStore E-Commerce Demo',
    description: 'Online storefront with catalog, cart, and express checkout.',
    repoUrl: 'https://github.com/demo/nextstore-broken-checkout',
    repoProvider: 'sample_fixture',
    defaultBranch: 'main',
    config: {
      startupCommand: 'npm run start',
      buildCommand: 'npm run build',
      port: 3000,
      timeoutSecs: 30,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  preloadedRun: {
    id: 'run-demo-ecommerce-checkout-baseline',
    projectId: 'prj-demo-ecommerce-checkout',
    projectVersionId: 'ver_demo_ecommerce',
    runNumber: 1,
    status: 'failed',
    buildStatus: 'success',
    startupStatus: 'success',
    commitHash: 'ecom404a1b2',
    branch: 'main',
    executionConfig: {
      isolationMode: 'local_process_sandbox',
      port: 3000,
      timeoutMs: 30000,
    },
    isolationDisclaimer: 'Execution conducted in process sandbox',
    summary: {
      total: 5,
      passed: 3,
      failed: 2,
      blocked: 0,
      skipped: 0,
      inconclusive: 0,
    },
    logs: [
      '[sandbox] Mounted ephemeral workspace at /data/workspaces/demo-ecommerce',
      '[playwright] Launched Chromium headless browser instance',
      '[test] GET / - HTTP 200 OK (340ms)',
      '[test] GET /checkout - HTTP 200 OK (410ms)',
      '[test] Click #place-order-btn triggered fetch POST /api/checkout',
      '[network] <-- HTTP 404 Not Found on POST /api/checkout',
      '[error] Unhandled rejection: Failed to fetch order confirmation: HTTP 404',
      '[diagnoser] Formulating root cause and unified diff patch...',
    ],
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  initialTestResults: [
    {
      id: 't-ecom-1',
      runId: 'run-demo-ecommerce-checkout-baseline',
      name: 'Storefront Root Route Health Check',
      category: 'smoke',
      status: 'passed',
      durationMs: 340,
      actualResult: 'Storefront loaded HTTP 200 within 340ms',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-ecom-2',
      runId: 'run-demo-ecommerce-checkout-baseline',
      name: 'Catalog Navigation & Routing',
      category: 'route_discovery',
      status: 'passed',
      durationMs: 410,
      actualResult: 'Discovered /catalog route and rendered 12 products',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-ecom-3',
      runId: 'run-demo-ecommerce-checkout-baseline',
      name: 'Cart Hydration & Line Item Count',
      category: 'user_flow',
      status: 'passed',
      durationMs: 520,
      actualResult: 'Cart counter incremented to 2 items correctly',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-ecom-4',
      runId: 'run-demo-ecommerce-checkout-baseline',
      name: 'Place Order Button Click Interaction',
      category: 'form_validation',
      status: 'failed',
      durationMs: 1240,
      actualResult: 'Order submission button click did not resolve to confirmation card within 5000ms',
      errorDetails: {
        message: 'Order submission button click did not resolve to confirmation card within 5000ms',
      },
      evidence: {
        consoleErrors: [],
        networkFailures: [
          {
            url: '/api/checkout',
            method: 'POST',
            status: 404,
            failureReason: 'Endpoint not implemented',
          },
        ],
        steps: [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-ecom-5',
      runId: 'run-demo-ecommerce-checkout-baseline',
      name: 'Backend API Route /api/checkout Health',
      category: 'api_health',
      status: 'failed',
      durationMs: 180,
      actualResult: 'HTTP 404 (Not Found) returned by POST /api/checkout',
      errorDetails: {
        message: 'HTTP 404 (Not Found) returned by POST /api/checkout',
      },
      evidence: {
        consoleErrors: [],
        networkFailures: [
          {
            url: '/api/checkout',
            method: 'POST',
            status: 404,
            failureReason: 'HTTP 404 Not Found',
          },
        ],
        steps: [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  ],
  initialFindings: [
    {
      id: 'f-ecom-1',
      runId: 'run-demo-ecommerce-checkout-baseline',
      severity: 'high',
      title: 'Missing Route Handler: POST /api/checkout',
      description: 'The storefront attempted to place an order via POST /api/checkout which returned HTTP 404.',
      observedEvidence: 'Network trace captured HTTP 404 response on POST /api/checkout during order form click.',
      aiHypothesis: 'Route handler is missing from the src/app/api/checkout/ directory.',
      suggestedFix: 'Implement src/app/api/checkout/route.ts to handle POST requests.',
      confidenceScore: 96,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'f-ecom-2',
      runId: 'run-demo-ecommerce-checkout-baseline',
      severity: 'high',
      title: 'Checkout Form Unhandled Exception',
      description: 'Clicking #place-order-btn triggered an unhandled network error leaving UI frozen in loading state.',
      observedEvidence: 'Button remained in disabled state after 404 failure without displaying error alert.',
      aiHypothesis: 'Form lacks try/catch error handling around checkout fetch call.',
      suggestedFix: 'Wrap fetch call in try/catch and display user-friendly error state.',
      confidenceScore: 94,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
};
