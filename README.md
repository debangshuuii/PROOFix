<div align="center">

# PROOFix

### *Don't just generate code. Prove that it works.*

An AI-powered software verification and browser testing platform that inspects repositories, runs applications in isolated execution sandboxes, conducts genuine Playwright Chromium tests, and formulates evidence-grounded failure explanations with reviewable patch diffs.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-green?style=flat&logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 💡 The Core Principle

> **"Never claim that an application works without evidence from actual checks."**

AI coding assistants can generate full applications in seconds, but generated code often contains broken buttons, missing routes, failing backend APIs, unhandled JavaScript exceptions, incomplete forms, and responsive layout breakage.

PROOFix addresses this by:
1. **Inspecting Repositories Transparently**: Detects frameworks, package managers, scripts, routes, and environment variable requirements (with secret redaction).
2. **Executing in Sandboxed Processes**: Launches applications on isolated dynamic ports with force-kill process tree tracking.
3. **Driving Genuine Playwright Checks**: Explores pages, audits navigation links for 404s, tests interactive React state, monitors for unhandled JS errors, and detects HTTP 500 API failures.
4. **Evidence-Based AI Diagnosis**: Distinguishes observed facts from probabilistic hypotheses, generating actionable fix instructions and unified patch diff previews.
5. **Persistent Verification Reports & Regression Analysis**: Stores persistent run histories, side-by-side run comparisons, and standalone HTML/JSON exports.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v20+` (tested on Node v24.x)
- **npm**: `v10+` (tested on npm 11.x)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/debangshuuii/PROOFix.git
cd PROOFix

# Install dependencies
npm install

# Download Playwright Chromium browser binaries
npx playwright install chromium
```

### 3. Launch Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 Zero-Setup Interactive Demo Playground

> **"Experience automated failure detection, AI diagnosis, and self-healing fixes in 10 seconds — with zero configuration."**

PROOFix features 3 pre-packaged defect scenarios accessible with one click from the [Landing Page](http://localhost:3000/#playground) and [Dashboard](http://localhost:3000/dashboard):

- **E-Commerce Broken Checkout**: Form submission failure + missing `/api/checkout` (HTTP 404).
- **Next.js SSR Hydration Drift**: Server/client timestamp drift triggering React 19 Hydration Error #418.
- **SQL Injection Preflight Gate**: Raw string concatenation in `db.query()` blocked by the AST Security Gate (CWE-89).

Execute the automated playground CI verification suite:
```bash
npm run test:playground
```

---

## 🤖 Model Context Protocol (MCP) Server (`npx proofix mcp`)

PROOFix integrates natively into AI coding agents (Cursor, Claude Code, Windsurf, Antigravity) via the standard MCP protocol:

- **`proofix_run_route`**: Tests specific routes with genuine Playwright Chromium.
- **`proofix_diagnose_failure`**: Formulates evidence-grounded root causes and diffs.
- **`proofix_prove_patch`**: Proves self-healing patches in shadow worktrees with zero regressions.

```bash
npx proofix mcp
```

---

## 🛡️ Dual-Pass Shadow Prover (`npx proofix prove`)

> **"Never accept an AI patch without mathematical execution evidence."**

When an AI patch is generated, PROOFix executes a shadow sandbox pass to certify that:
1. The target defect is completely extinguished.
2. All baseline checks pass with 100% pass rate.
3. Issues a tamper-proof SHA-256 cryptographic proof certificate.

```bash
npx proofix prove --scenario ecommerce_checkout
```

---

## ⚡ Turnkey Reusable GitHub Action (`proofix/action@v1`)

> **"Never merge unverified code. Turnkey 3-line CI verification with zero-noise sticky PR comments."**

Add PROOFix directly to `.github/workflows/proofix.yml`:

```yaml
name: PROOFix Verification Gate

on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: proofix/action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-hydration-drift: 'true'
          fail-on-broken-routes: 'true'
          post-sticky-comment: 'true'
```

- **Sticky PR Comments:** Updates existing bot comments in-place with interactive before/after visual sliders.
- **Video Failure Bookmarks:** Jump straight to the exact failure timestamp in captured Playwright recordings.
- **Prove & Auto-Fix:** Dispatches self-healing repairs directly back to your PR branch.
- **Hard Check-Run Gatekeeper:** Blocks merges if React 19 SSR hydration drift (#418) or dead 404 links occur.

---

## 💻 VS Code & Cursor Native IDE Extension

> **"Prove routes without leaving your editor. Gutter badges, CodeLens, and inline self-healing diffs."**

PROOFix runs natively inside VS Code and Cursor (`extensions/vscode-proofix`):

- **Route Gutter Badges:** Subtle green/red status lenses beside Next.js route handlers (`app/**/page.tsx` & `app/api/**/route.ts`).
- **Inline CodeLens:** One-click `▶ Run Journey` and `🛡️ Prove Route` above route exports.
- **VS Code Test Explorer:** Seamless integration into the native Test Activity Bar with live step progress.
- **Inline Patch Application:** Click "Apply Proven Fix" to review side-by-side split diffs with automatic rollback `.proofix.bak` protection.

---

## 💻 Native Developer CLI Tooling (`bin/proofix.js`)

PROOFix includes a command-line developer tool for terminal workflows:

### 1. Environmental Diagnostics (`npx proofix doctor`)
Validates host environment: Node.js version (`>= 20`), Playwright Chromium binary presence, ephemeral loopback port permissions, and active AI keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`).
Auto-heals missing binaries with `--heal`:
```bash
npx proofix doctor --heal
```

### 2. Interactive Terminal UI (`npx proofix run --interactive`)
Terminal UI (TUI) displaying an animated 11-stage pipeline progress bar and real-time streaming logs:
```bash
npx proofix run --interactive --scenario ecommerce_checkout
```

### 3. Patch Review & Self-Healing (`npx proofix fix --apply`)
Terminal-based patch review prompt with color-highlighted unified diffs and interactive confirmation `[y/N/diff/help]`:
```bash
# Review patch interactively with diff inspection
npx proofix fix --scenario ecommerce_checkout

# Automatically apply patch with automatic backup (.proofix.bak)
npx proofix fix --scenario ecommerce_checkout --apply

# Rollback previously applied patch
npx proofix fix --scenario ecommerce_checkout --rollback
```

### 4. Local Watch Mode (`npx proofix watch`)
File watcher re-running Playwright journeys automatically on file save (analogous to Vitest / Jest watch mode) with interactive hotkeys (`r` rerun, `a` all, `d` doctor, `c` clear, `q` quit):
```bash
npx proofix watch --debounce 300
```

Run the complete CLI test suite:
```bash
npm run test:cli
```

---

## 🧪 Testing with the Built-in Verification Fixture

PROOFix includes an interactive verification testbed (`src/fixtures/sample-app`) with known, deterministic test outcomes:

1. Open the [Dashboard](http://localhost:3000/dashboard).
2. Click **"Import Sample Testbed"** or open the pre-seeded **"PROOFix Verification Testbed"** project.
3. Click **"Start Verification Run"**.
4. Watch the live 11-stage progress tracker and streaming execution telemetry:
   - **Root URL Health Check**: Loads within 850ms, verifies DOM (`Passed`)
   - **Route Navigation (/about)**: Navigates without exceptions (`Passed`)
   - **Interactive UI Event Check**: Clicks button, verifies React state hydration (`Passed`)
   - **Dead Link 404 Audit**: Navigates to `/broken-route`, catches HTTP 404 (`Failed`)
   - **Backend API (/api/data)**: Intercepts HTTP 500 database failure (`Failed`)
   - **Evidence Diagnosis**: AI formulates root cause and produces unified patch diff preview
5. Export report as standalone HTML or JSON with one click.

---

## 🛠️ Automated Self-Verification Suite

To verify PROOFix's internal components:

```bash
# Run automated verification suite
node tests/verify-proofix.mjs

# Run full production build verification
npm run build
```

---

## 📁 Repository Structure

```
PROOFix/
├── src/
│   ├── app/                         # Next.js 16 App Router UI & REST APIs
│   │   ├── api/v1/                  # REST Endpoints
│   │   │   ├── health/              # Health probe
│   │   │   ├── ready/               # Readiness probe
│   │   │   ├── projects/            # Project CRUD & Analysis
│   │   │   ├── runs/                # Verification runs, tests, findings, SSE stream
│   │   │   └── settings/            # System settings & provider keys
│   │   ├── dashboard/               # Verification Dashboard
│   │   ├── projects/                # Project overview, routes, history, run comparison
│   │   ├── settings/                # Settings & provider configuration
│   │   └── page.tsx                 # Landing Page
│   ├── components/                  # Navbar, StatusBadge, DiffViewer
│   ├── fixtures/sample-app/         # Interactive benchmark testbed app
│   └── lib/
│       ├── analyzer/                # Repository inspector & route discovery
│       ├── execution/               # Process sandbox runner & SSE event broadcaster
│       ├── testing/                 # Genuine Playwright Chromium engine
│       ├── ai/                      # Evidence-grounded diagnoser (Gemini, OpenAI, Offline)
│       ├── comparison/              # Regression detector
│       ├── db/                      # ACID transactional JSON persistence engine
│       └── types/                   # Domain TypeScript models
├── data/                            # Persistent JSON store & isolated workspaces
├── public/artifacts/                # Captured Playwright screenshots & logs
├── tests/                           # Automated self-verification tests
├── docs/                            # Architecture, Security, and Development guides
├── Dockerfile                       # Production container with Playwright
├── docker-compose.yml               # Multi-service local deployment
├── .env.example                     # Environment variables template
└── README.md
```

---

## 🔒 Security & Safe Test Policy

- **Destructive Actions Blocked**: Forms triggering payments, user deletions, or irreversible database mutations are bypassed unless explicitly authorized.
- **Path Traversal Defense**: Zip uploads are scanned to neutralize Zip Slip vulnerabilities and zip bombs.
- **Secret Redaction**: Environment variables are scanned for names only; values are never leaked to logs or AI prompts.
- **Sandbox Process Trees**: Spawns isolated child process trees and ensures force-kill cleanup on completion or cancellation.

---

## 📄 Documentation

- [Turnkey GitHub Action & Sticky PR Bot](docs/TURNKEY_GITHUB_ACTION_AND_PR_BOT.md)
- [VS Code & Cursor Native IDE Extension](docs/VSCODE_CURSOR_NATIVE_EXTENSION.md)
- [Zero-Setup Interactive Demo Playground](docs/ZERO_SETUP_INTERACTIVE_PLAYGROUND.md)
- [Enterprise UI/UX & Developer Experience](docs/ENTERPRISE_UI_UX_DEVELOPER_EXPERIENCE.md)
- [Interactive OpenAPI 3.1 Reference](/docs)
- [Architecture & Subsystems](docs/architecture.md)
- [Pluggable Production Database Engine](docs/PLUGGABLE_PRODUCTION_DATABASE_ENGINE.md)
- [AI Diagnosis & Self-Repair Loop](docs/AI_DIAGNOSIS_AND_SELF_REPAIR_LOOP.md)
- [Security Model & Threat Boundaries](docs/security.md)
- [Development & Operations Guide](docs/development.md)

---

## 🎨 Enterprise UI/UX & Developer Experience

- **Responsive Mobile Navigation**: Slide-out animated drawer on viewports `< 768px` with accessible focus traps and Escape key dismissal.
- **Theme Switcher**: Zero-FOUC persistence with dark, light, and OS system media query synchronization.
- **Global Command Palette (`Cmd+K` / `Ctrl+K`)**: Universal fuzzy search indexing across active projects, recent execution runs, failing tests, and AI fix proposals with Tab category cycling.
- **Streaming Virtualized Terminal**: High-performance interactive log viewer with ANSI color tokenization, log severity filtering (DEBUG, INFO, WARN, ERROR), regex search, and auto-scroll lock.
- **Interactive OpenAPI Reference (`/docs`)**: Scalar/Swagger reference hub with live Try-It-Out console and multi-language snippets (cURL, JavaScript, Python, Node.js).


---

## 📜 License

MIT License. Designed and engineered for software developers, indie hackers, vibe coders, and teams who want evidence that their applications work.
