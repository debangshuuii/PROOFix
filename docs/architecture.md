# PROOFix System Architecture

## 1. Executive Summary

PROOFix is an AI-powered application verification platform built around a foundational principle:

> **"Never claim that an application works without evidence from actual checks."**

While generative AI models excel at code generation, they frequently produce applications with subtle, compounding failures—dead navigation links, uncaught runtime exceptions, broken form handlers, 500 API responses, and viewport overflow. PROOFix provides a verifiable feedback loop by launching applications inside isolated environments, driving them with genuine Playwright Chromium browser tests, gathering objective telemetry, and formulating evidence-based failure diagnoses.

---

## 2. System Architecture Diagram

```
+----------------------------------------------------------------------------------+
|                               PROOFix Web Console                                |
|  - Modern Next.js 16 App Router UI with Tailwind CSS & Dark Technical Theme      |
|  - Real-Time Live Run Telemetry Stream (Server-Sent Events)                       |
|  - Verification Reports, Evidence Gallery & Unified Diff Patch Previews          |
+----------------------------------------------------------------------------------+
                                        |  REST APIs / SSE
                                        v
+----------------------------------------------------------------------------------+
|                            PROOFix Application Server                            |
|                                                                                  |
|  +--------------------+  +--------------------+  +-----------------------------+ |
|  | Project Analyzer   |  | Execution Sandbox  |  | Playwright Browser Engine   | |
|  | - Package manifests|  | - Dynamic ports    |  | - Chromium Headless Shell   | |
|  | - Route discovery  |  | - Secret sanitizing|  | - Link 404 detector         | |
|  | - Script extraction|  | - Process kill tree|  | - Uncaught JS exception trap| |
|  | - Blocker detection|  | - Readiness probes |  | - 500 API monitor           | |
|  +--------------------+  +--------------------+  +-----------------------------+ |
|                                                                                  |
|  +--------------------------------------------+  +-----------------------------+ |
|  | AI Failure Diagnoser & Repair Engine       |  | ACID Persistence Layer      | |
|  | - Google Gemini 2.0 / OpenAI / Anthropic   |  | - Atomic JSON File Engine   | |
|  | - Deterministic Rule Fallback (Offline)    |  | - Write locks & tmp rename  | |
|  | - Grounded facts vs AI hypotheses          |  | - Project & Run historical  | |
|  +--------------------------------------------+  +-----------------------------+ |
+----------------------------------------------------------------------------------+
```

---

## 3. Core Subsystems

### A. Repository Inspector & Route Discovery
- Analyzes `package.json`, lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`), scripts, and dependencies.
- Recursively inspects file system routing (Next.js App Router `page.tsx`/`route.ts` and Pages Router `pages/**/*.tsx`).
- Identifies environment variable requirements from `.env.example` templates, strictly redacting all values.
- Infers startup commands and readiness URLs with explicit confidence classifications.

### B. Sandbox Execution Engine
- Spawns target applications using dedicated dynamic ports (preventing conflict with port 3000/8000).
- Polls readiness probe targets until HTTP 200/300/404 responds or timeout triggers.
- Enforces execution timeouts and kills entire child process trees using OS-native controls (`taskkill /t /f` on Windows, `SIGTERM` on POSIX).
- Explicitly labels execution security mode (`local_process_sandbox` vs `container_isolated`).

### C. Playwright Browser Engine
- Uses genuine Chromium Headless Shell to open the running application.
- Listens to `pageerror` for unhandled JavaScript exceptions with stack traces.
- Captures failed network requests (`response.status() >= 400` and `requestfailed`).
- Audits responsive viewports: Mobile (375x667), Tablet (768x1024), and Desktop (1280x720) checking for horizontal overflow (`scrollWidth > innerWidth`).
- Takes full-page screenshots at every checkpoint and test failure.

### D. Evidence-Based AI Failure Diagnoser
- Implements strict distinction between **Observed Facts** (e.g. "Observed HTTP 404 response on /broken-route") and **AI Hypotheses** (e.g. "Typo in href or missing route file").
- Supports Gemini 2.0, OpenAI GPT-4o, Anthropic Claude, and a built-in Deterministic Rule Diagnoser that functions completely offline without API keys.
- Generates unified patch diffs (`--- a/... +++ b/...`) for developer review.

### E. Turnkey GitHub Action & Sticky PR Bot (`proofix/action@v1`)
- Runs directly inside GitHub Actions workflows without webhook servers.
- Manages dynamic sticky PR comments updating in-place on every push.
- Generates client-side before/after interactive visual sliders and timestamped failure video links.
- Enforces hard check-run gating on React 19 SSR hydration drift (#418) and dead route 404s.
- Dispatches "Prove & Auto-Fix" self-healing workflows committing verified patches to the PR branch.
