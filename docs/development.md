# PROOFix Local Development & Operations Guide

## 1. Prerequisites

- **Node.js**: v20+ (tested with v24.x)
- **npm**: v10+ (tested with v11.x)
- **Playwright Chromium**: installed automatically via `npx playwright install chromium`

---

## 2. Installation & Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser binaries
npx playwright install chromium

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` to access the PROOFix Console.

---

## 3. Running Self-Verification Tests

```bash
# Run automated verification suite
node tests/verify-proofix.mjs

# Run full production build check
npm run build
```

---

## 4. Testing with Built-in Verification Fixture

PROOFix includes an interactive sample fixture at `src/fixtures/sample-app`:

1. Open `http://localhost:3000/dashboard`.
2. Click **"Import Sample Testbed"** (or open the pre-seeded project).
3. Click **"Start Verification Run"**.
4. Observe the live 11-stage progress tracker and Playwright Chromium execution.
5. Inspect the persistent report showing:
   - Root URL availability (Passed)
   - Route `/about` navigation (Passed)
   - Interactive counter clickability (Passed)
   - Dead link `/broken-route` detection (Failed - 404)
   - API `/api/data` crash (Failed - 500)
   - Grounded AI diagnosis and syntax-highlighted code diff preview.
