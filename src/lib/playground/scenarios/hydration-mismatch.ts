/**
 * Demo Scenario 2: Next.js SSR Hydration Drift Crash
 *
 * Demonstrates automated Playwright interception of unhandled browser
 * console errors caused by React 19 server/client DOM hydration mismatches.
 */

import type { DemoScenarioContract } from '../types.ts';

export const HYDRATION_MISMATCH_SCENARIO: DemoScenarioContract = {
  id: 'hydration_mismatch',
  title: 'Next.js SSR Hydration Drift Crash',
  subtitle: 'Server/client timestamp divergence triggers React 19 hydration bailout',
  description:
    'Audits a dashboard status widget. Direct invocation of Date().toLocaleTimeString() during server-side rendering produces differing HTML markup from browser client hydration, throwing React 19 Hydration Error #418.',
  category: 'framework_react',
  badge: 'React 19 SSR Drift',
  difficulty: 'Intermediate',
  tags: ['React 19', 'SSR', 'Hydration Error', 'Console Interception', 'Auto-Repair'],
  fault: {
    headline: 'Client DOM tree diverges from server HTML markup on dynamic timestamp evaluation',
    technicalSummary:
      'LiveServerClock.tsx evaluates Date().toLocaleTimeString() directly inside the component return statement. The milliseconds elapsed between server rendering and browser execution cause textual mismatch, triggering unhandled React error #418.',
    faultyFile: 'src/components/dashboard/LiveServerClock.tsx',
    severity: 'high',
    expectedFailure: {
      stepName: 'Client-Side React Hydration Audit',
      category: 'smoke',
      expectedStatus: 'failed',
      errorMessage: 'Unhandled browser console error: Hydration failed because the initial UI does not match what was rendered on the server.',
      domSelector: '#live-server-clock',
      detectedStage: 'Unhandled Console Exception Auditing',
    },
  },
  aiDiagnosis: {
    rootCause: 'Dynamic locale time generation executed synchronously during SSR render cycle.',
    explanation:
      'React 19 requires initial client render to match server-sent HTML byte-for-byte. In LiveServerClock.tsx, invoking Date() unconditionally during render produces a timestamp drift between the server response and the browser hydration phase.',
    suggestedFix:
      'Introduce a mounted state guard with useEffect to defer client timestamp rendering until after initial hydration or apply suppressHydrationWarning.',
    confidenceScore: 0.98,
  },
  fixProposal: {
    targetFile: 'src/components/dashboard/LiveServerClock.tsx',
    summary: 'Guard timestamp rendering behind useEffect mounted state to ensure deterministic SSR.',
    patchDiff: `--- a/src/components/dashboard/LiveServerClock.tsx
+++ b/src/components/dashboard/LiveServerClock.tsx
@@ -1,7 +1,14 @@
 'use client';
 
-import React from 'react';
+import React, { useState, useEffect } from 'react';
 
 export function LiveServerClock() {
+  const [mounted, setMounted] = useState(false);
+  useEffect(() => {
+    setMounted(true);
+  }, []);
+
+  if (!mounted) {
+    return <div id="live-server-clock" className="text-slate-500 font-mono text-sm">Synchronizing clock...</div>;
+  }
   const time = new Date().toLocaleTimeString();
   return (
     <div id="live-server-clock" className="font-mono text-sky-400 font-bold">`,
  },
  benchmark: {
    detectionTimeMs: 890,
    aiDiagnosisConfidence: 0.98,
    patchGenerationTimeMs: 380,
    verificationPassRate: 1.0,
    zeroConfigRating: '10/10 Instant',
  },
  seedProject: {
    id: 'prj-demo-hydration-mismatch',
    name: 'PulseOps Dashboard Demo',
    provider: 'sample_fixture',
    repoUrl: 'https://github.com/demo/pulseops-hydration-crash',
    branch: 'main',
    framework: 'nextjs',
    packageManager: 'npm',
    scripts: { dev: 'next dev', build: 'next build', test: 'playwright test' },
    environmentVariables: ['NEXT_PUBLIC_TIMEZONE'],
    routes: ['/', '/analytics', '/metrics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  preloadedRun: {
    id: 'run-demo-hydration-mismatch-baseline',
    projectId: 'prj-demo-hydration-mismatch',
    status: 'failed',
    summary: {
      totalTests: 5,
      passed: 3,
      failed: 2,
      blocked: 0,
      skipped: 0,
    },
    stages: [
      { name: 'Repository Analysis', status: 'passed', durationMs: 180 },
      { name: 'Sandbox Startup', status: 'passed', durationMs: 760 },
      { name: 'Root URL Health', status: 'passed', durationMs: 290 },
      { name: 'Hydration & Console Exception Interception', status: 'failed', durationMs: 890 },
      { name: 'Route Navigation', status: 'passed', durationMs: 380 },
    ],
    logs: [
      '[sandbox] Mounted ephemeral workspace at /data/workspaces/demo-hydration',
      '[playwright] Launched Chromium headless browser instance',
      '[test] GET / - HTTP 200 OK (290ms)',
      '[console.error] Error: Hydration failed because the initial UI does not match what was rendered on the server.',
      '[console.error] Warning: Text content did not match. Server: "10:30:15 AM" Client: "10:30:16 AM"',
      '[playwright] Caught uncaught browser console exception during hydration check',
      '[diagnoser] Formulating root cause and unified diff patch...',
    ],
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: new Date().toISOString(),
  },
  initialTestResults: [
    {
      id: 't-hyd-1',
      runId: 'run-demo-hydration-mismatch-baseline',
      name: 'Root Route SSR Response Health Check',
      category: 'smoke',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 290,
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-hyd-2',
      runId: 'run-demo-hydration-mismatch-baseline',
      name: 'Client-Side React Hydration Audit',
      category: 'smoke',
      risk: 'safe_read_only',
      status: 'failed',
      durationMs: 150,
      errorMessage: 'Unhandled browser console error: Hydration failed because the initial UI does not match what was rendered on the server.',
      domSelector: '#live-server-clock',
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-hyd-3',
      runId: 'run-demo-hydration-mismatch-baseline',
      name: 'Dashboard Analytics Route Navigation',
      category: 'navigation',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 380,
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-hyd-4',
      runId: 'run-demo-hydration-mismatch-baseline',
      name: 'Zero Browser Console Exceptions Policy Gate',
      category: 'smoke',
      risk: 'safe_read_only',
      status: 'failed',
      durationMs: 80,
      errorMessage: 'Intercepted 1 critical browser console error during DOM mounting',
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-hyd-5',
      runId: 'run-demo-hydration-mismatch-baseline',
      name: 'DOM Tree Structural Stability & Integrity',
      category: 'smoke',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 420,
      timestamp: new Date().toISOString(),
    },
  ],
  initialFindings: [
    {
      id: 'f-hyd-1',
      runId: 'run-demo-hydration-mismatch-baseline',
      type: 'hydration_mismatch',
      severity: 'high',
      title: 'React Hydration Mismatch Error #418',
      description: 'Server markup and client DOM diverged at #live-server-clock due to unshielded timestamp evaluation.',
      suggestedFix: 'Wrap dynamic timestamp output in a mounted boolean state check with useEffect.',
    },
    {
      id: 'f-hyd-2',
      runId: 'run-demo-hydration-mismatch-baseline',
      type: 'console_exception',
      severity: 'high',
      title: 'Intercepted Unhandled Console Exception',
      description: 'Browser console threw fatal hydration error during initial page reconciliation.',
      suggestedFix: 'Resolve server/client HTML divergence to achieve zero-warning console output.',
    },
  ],
};
