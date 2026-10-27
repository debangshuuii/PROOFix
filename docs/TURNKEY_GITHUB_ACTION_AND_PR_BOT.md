# 🚀 Turnkey GitHub Action & Sticky PR Bot

> **"Never merge unverified code. Prove every pull request with genuine Playwright Chromium evidence."**

The **PROOFix GitHub Action** (`proofix/action@v1`) turns PROOFix into an automated quality gatekeeper for your team. It inspects repositories, launches applications in isolated execution sandboxes, conducts genuine browser journeys, and posts dynamic, sticky PR comments that update cleanly on every commit without comment noise.

---

## ⚡ 3-Line Turnkey Workflow

Drop `.github/workflows/proofix.yml` into your repository:

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
```

That's it. On every pull request, PROOFix will automatically verify your application and report findings directly inside GitHub.

---

## 💎 10/10 Enterprise Features

### 1. Dynamic Sticky PR Comments (Zero-Noise)
Unlike standard CI bots that flood pull requests with 20 repetitive comments on every re-push, PROOFix identifies its previous comment via invisible cryptographic markers (`<!-- proofix-sticky-pr-comment -->`) and **updates it in-place**.

### 2. Interactive Before/After Visual Regression Slider
- Renders an interactive, client-side before/after split slider in HTML5.
- Drag the slider handle to inspect visual regressions pixel-by-pixel.
- Generates a standalone, zero-auth proof preview HTML artifact viewable by any team member.

### 3. Timestamped Failure Video Deep Linking
- Every failed user journey captures a full Playwright Chromium video recording.
- PROOFix pinpoints the exact failure timestamp (e.g., `▶ 00:04`) and links directly to that moment in the video.

### 4. "Prove & Auto-Fix" Self-Healing Dispatch
- When defects are detected, PROOFix renders a **"Prove & Auto-Fix"** shields badge.
- Clicking the badge triggers `.github/workflows/proofix-autofix.yml`, which:
  1. Clones your branch.
  2. Runs `npx proofix fix --apply` and the Dual-Pass Shadow Prover.
  3. Commits the verified patch with a tamper-proof SHA-256 certificate directly back to the PR!

### 5. Hard Check-Run Gating (Blocking Merges)
- **React 19 SSR Hydration Drift (#418):** Detects server/client HTML divergence and blocks merge.
- **Dead Link 404 Auditing:** Catches broken navigation links and issues red status checks.
- **Line-Level Annotations:** Annotates the exact route handler file (`app/api/checkout/route.ts`) right in the GitHub "Files changed" diff tab!

---

## 🛠️ Action Inputs & Configuration

| Input | Description | Default |
| :--- | :--- | :--- |
| `github-token` | GitHub access token (`secrets.GITHUB_TOKEN`) | Required |
| `verification-profile` | `smoke`, `full`, `visual`, or `fast` | `full` |
| `fail-on-hydration-drift` | Blocks merge if React 19 hydration drift (#418) is detected | `true` |
| `fail-on-broken-routes` | Blocks merge if HTTP 404 navigation failures occur | `true` |
| `fail-on-vitals-budget` | Blocks merge if LCP > 2.5s or CLS > 0.1 | `true` |
| `post-sticky-comment` | Updates existing PR comments in-place | `true` |
| `auto-fix-workflow` | Workflow file dispatched by auto-repair badge | `proofix-autofix.yml` |
| `report-output` | Directory where HTML/JSON reports and artifacts are saved | `proofix-reports` |
| `timeout-minutes` | Maximum execution timeout | `15` |
