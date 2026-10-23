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
