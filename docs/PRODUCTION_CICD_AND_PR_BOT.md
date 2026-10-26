# 🛡️ PROOFix Production CI/CD & Turnkey GitHub PR Bot

> **"Never merge unproven code. Enforce genuine Playwright checks, Core Web Vitals performance budgets, and mathematical zero-regression proof before code hits production."**

PROOFix transforms your GitHub pull request workflow into a mandatory, evidence-grounded quality gate. It executes real browser journeys in isolated sandboxes, enforces strict Core Web Vitals budgets (LCP &le; 2.5s, CLS &le; 0.10), audits visual layouts for pixel regressions, and provides autonomous self-healing via interactive 1-click links and `/proofix fix` PR comments.

---

## 🚀 Key Capabilities

### 1. Mandatory Pull Request Status Check
- Runs on every `pull_request` (open, synchronize, reopen).
- Spawns isolated Playwright Chromium instances.
- Sets commit status check `proofix/pr-gate` to **PASSED** (exit code 0) or **BLOCKED** (exit code 1).
- Protects `main` branch merges via GitHub Branch Protection Rules.

### 2. Core Web Vitals & Lighthouse Performance Gate
- **Largest Contentful Paint (LCP)**: Must render within **2500ms** (2.5s). Violations fail the build with actionable element remediation.
- **Cumulative Layout Shift (CLS)**: Visual layout shift score must not exceed **0.10**.
- **Time to First Byte (TTFB)**: Must respond within **800ms**.
- **Interaction to Next Paint (INP)**: Main thread responsiveness budget of **200ms**.

### 3. Rich GitHub PR Comment Bot
Automatically posts review comments featuring:
- **Tamper-Proof Cryptographic SHA-256 Proof Badge**: Unique fingerprint guaranteeing zero regressions.
- **Core Web Vitals Metric Table**: Pass/fail status for LCP, CLS, and TTFB.
- **Side-by-Side Visual Regression Slider**: Before (Baseline) vs. After (Candidate) vs. Pixel Diff Heatmap.
- **Unified Diff Code Proposal**: Root-cause analysis and proposed fix snippet.
- **1-Click Apply Link**: Interactively review and apply patch via Web UI.

### 4. Interactive Slash Commands (`/proofix fix`)
Developers can comment directly on any Pull Request to trigger automated agent workflows:

| Command | Action |
| :--- | :--- |
| `/proofix fix` or `/proofix heal` | Autonomous self-healing: generates code patch and commits directly to the PR branch. |
| `/proofix prove` | Re-executes the Dual-Pass Shadow Prover and issues an updated SHA-256 certificate. |
| `/proofix budget` | Outputs detailed Core Web Vitals breakdown and Lighthouse audit. |
| `/proofix help` | Displays the interactive command reference cheatsheet. |

---

## 🛠️ GitHub Actions Workflow Configuration

Add `.github/workflows/proofix-pr-gate.yml` to your repository:

```yaml
name: 'PROOFix / PR Quality & Performance Gate'

on:
  pull_request:
    branches: [main, master]
  issue_comment:
    types: [created]

jobs:
  pr-verification-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run PROOFix Verification & Vitals Gate
        uses: debangshuuii/PROOFix@main
        with:
          project-path: '.'
          verification-profile: 'full'
          lcp-budget-ms: '2500'
          cls-budget: '0.10'
          fail-on-vitals-budget: 'true'
          fail-on-regression: 'true'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 🔐 Cryptographic Proof Verification

Every passed run issues a tamper-proof SHA-256 cryptographic certificate verifiable at:
```
https://proofix.dev/api/v1/prover/verify?hash=<FINGERPRINT>&sig=<SIGNATURE>
```
Verification ensures no test metrics, timestamps, or regression counts have been altered post-execution.
