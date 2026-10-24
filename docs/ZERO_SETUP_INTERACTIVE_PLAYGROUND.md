# Zero-Setup Interactive Demo Playground

> **"Never claim an application works without evidence from actual checks — and make that evidence verifiable in 10 seconds without any local setup."**

The **PROOFix Zero-Setup Interactive Demo Playground** delivers an instant, zero-friction demonstration environment where evaluators, engineers, and stakeholders can experience end-to-end failure detection, Playwright browser telemetry, evidence-grounded AI diagnosis, and atomic AST-backed self-repair in under 10 seconds — without configuring local databases, Docker daemons, or cloud API keys.

---

## 💡 Architectural Principle

Traditional verification platforms suffer from high evaluation friction: installing headless browser binaries, configuring container runtimes, setting up test databases, and acquiring third-party LLM API keys. 

PROOFix eliminates this barrier by providing:
1. **Pre-Seeded Real-World Scenarios**: Curated defect patterns mirroring the most prevalent production bugs in modern web applications.
2. **Ephemeral Simulation Engine**: Executes the complete 11-stage verification pipeline with real telemetry streaming.
3. **Deterministic Verification Provenance**: Generates unified patch diffs and proves that applying the patch transforms a failing run into a 100% green verified run with zero regressions.

---

## 🎯 The 3 Pre-Packaged Benchmark Scenarios

| Scenario | Category | Fault Signature | Detected Stage | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **1. E-Commerce Broken Checkout** | `functional_e2e` | Missing route handler returns `HTTP 404` on `POST /api/checkout`; `#place-order-btn` click handler hangs. | *Interactive State Hydration & Click Auditing* | High |
| **2. Next.js SSR Hydration Drift** | `framework_react` | Server/client timestamp evaluation drift throws unhandled React 19 `Error #418`. | *Unhandled Console Exception Auditing* | High |
| **3. SQL Injection Preflight Gate** | `security_preflight` | Raw string concatenation in `db.query()` detected by static AST scanner (`CWE-89`). | *Security Preflight Gate Validation* | Critical |

---

### Scenario 1: E-Commerce Broken Checkout & Missing Route
* **Domain**: Storefront checkout flow (`src/fixtures/playground/ecommerce/`).
* **The Defect**: User clicks `#place-order-btn`. The form attempts to submit payment to `/api/checkout`, but the route handler is missing from the App Router directory, resulting in an HTTP 404 dead route and an unhandled Promise rejection leaving the button frozen.
* **PROOFix Detection**: Playwright Chromium intercepts the 404 network response and captures the DOM timeout.
* **AI Diagnosis & Fix**: Generates `src/app/api/checkout/route.ts` handling POST requests and validates payload items.

```diff
--- /dev/null
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
+}
```

---

### Scenario 2: Next.js SSR Hydration Drift Crash
* **Domain**: PulseOps real-time metrics dashboard (`src/fixtures/playground/hydration/`).
* **The Defect**: `LiveServerClock.tsx` executes `Date().toLocaleTimeString()` synchronously during server-side rendering. When the browser reconciles the DOM, the timestamp has drifted, triggering React 19 Hydration Error #418.
* **PROOFix Detection**: Playwright browser console listener intercepts `Error: Hydration failed because the initial UI does not match what was rendered on the server`.
* **AI Diagnosis & Fix**: Introduces a `mounted` state lifecycle guard using `useEffect` to ensure deterministic initial SSR markup.

```diff
--- a/src/components/dashboard/LiveServerClock.tsx
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
```

---

### Scenario 3: Unauthenticated SQL Injection in Search Query Preflight
* **Domain**: VaultAdmin administrative directory (`src/fixtures/playground/sqlinjection/`).
* **The Defect**: `search-route.ts` interpolates user query input into a raw SQL template literal: ``SELECT * FROM users WHERE username = '${q}'``.
* **PROOFix Detection**: Static AST preflight scanner intercepts the unparameterized database query and flags `CWE-89`, immediately halting deployment before the code reaches runtime.
* **AI Diagnosis & Fix**: Rewrites query to use parameterized placeholders (`$1`) with bound parameter arrays.

```diff
--- a/src/app/api/users/search/route.ts
+++ b/src/app/api/users/search/route.ts
@@ -6,5 +6,5 @@
   const q = req.nextUrl.searchParams.get('q') || '';
-  const query = `SELECT * FROM users WHERE username = '${q}'`;
-  const results = await db.query(query);
+  const query = 'SELECT id, username, email, role FROM users WHERE username = $1';
+  const results = await db.query(query, [q]);
```

---

## ⚡ 11-Stage Verification Pipeline Progression

Each scenario progresses through PROOFix's verified execution stages:

1. **Repository Analysis & Route Discovery**: Scans App Router, entry points, and dependencies.
2. **Process Tree & Dynamic Port Allocation**: Spawns isolated process on dynamic port.
3. **Root URL Health Check**: Loads root endpoint and monitors TTFB.
4. **Navigation & Route Traversal**: Audits internal link paths for 404s.
5. **Interactive State Hydration & Click Auditing**: Tests buttons, forms, and state transitions.
6. **404 Dead Link & Network Interception**: Intercepts HTTP 4xx/5xx requests.
7. **Unhandled Console Exception Auditing**: Traps browser console exceptions and React hydration errors.
8. **Security Preflight Gate Validation**: Audits AST policies and secret redaction.
9. **Multimodal AI Diagnosis Generation**: Formulates grounded root causes with confidence scores.
10. **AST-Backed Unified Patch Formulation**: Generates reviewable unified diffs.
11. **Post-Patch Verification & Green Provenance**: Re-executes verification to prove zero regressions.

---

## 📡 REST API Reference

The playground exposes full OpenAPI 3.1 compliant endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/playground/scenarios` | List all scenarios with optional `category` and `q` filters |
| `GET` | `/api/v1/playground/scenarios/:id` | Retrieve scenario detail, fault specification, and patch diff |
| `POST` | `/api/v1/playground/launch` | Launch interactive simulation run (returns `runId` and `runUrl`) |
| `POST` | `/api/v1/playground/apply-fix` | Apply AI patch and verify 100% green post-fix run |
| `POST` | `/api/v1/playground/reset` | Reset demo project back to baseline state |

---

## 🧪 Automated CI Test Suite

Execute the dedicated master playground verification suite:

```bash
# Run master playground verification suite
npm run test:playground

# Or execute directly via node
node tests/verify-demo-playground-ci.mjs
```
