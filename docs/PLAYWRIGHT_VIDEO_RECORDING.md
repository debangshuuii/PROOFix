# Playwright Video Recording Guide

## Overview

PROOFix provides integrated Playwright session video recording to let engineering teams replay automated browser test runs and diagnose failures visually. Instead of relying solely on static stack traces and log messages, developers can watch the exact sequence of user interactions and DOM mutations that led up to a regression.

---

## 1. Recording Policies & Modes

Recording policies can be configured at the project level or overridden per verification run:

| Mode | Behavior | Ideal Use Case | Storage Impact |
| :--- | :--- | :--- | :--- |
| `off` (Default) | No video capture or browser context recording overhead. | Standard fast local builds and resource-constrained environments. | Zero bytes |
| `only-on-failure` *(Recommended)* | Temporary session is recorded, but discarded if the test passes. Finalized and retained **only** if the test fails. | High-frequency CI pipelines and regression suites. | **Low**: 80–95% savings over `all`. |
| `retain-on-failure` | Retains recordings for failed tests as well as retry attempts. Discards clean passes on initial attempt. | Flaky test triage and retry-enabled test runners. | **Low-Medium** |
| `all` | Every single test session recording is finalized and permanently stored until retention expiration. | Compliance audits, onboarding recordings, and user flow documentation. | **High** |

```typescript
// Sample Configuration
{
  "mode": "only-on-failure",
  "resolution": { "width": 1280, "height": 720 },
  "fps": 25,
  "retention": {
    "maxAgeDays": 14,
    "maxTotalStorageMb": 1000,
    "maxPerFileMb": 50
  }
}
```

---

## 2. Playwright Video Lifecycle & Atomic Finalization

Playwright requires the browser context to be fully closed before flushing the WebM video stream buffer to disk. Reading or moving video files before the context closes produces corrupt 0-byte streams.

### Lifecycle State Machine:
1. **`initializing`**: Prepares isolated disk directories (`/artifacts/runs/[runId]/videos/raw/[tempId]`).
2. **`recording`**: Context is active, interacting with the page and capturing frames.
3. **`finalizing`**: Context closure is initiated; Playwright flushes buffer to disk. **Videos are strictly barred from being marked `ready` during this state.**
4. **`ready`**: File existence, header integrity, and non-empty byte counts are verified. Artifact is linked to the test result.
5. **`discarded`**: If policy is `only-on-failure` and the test passed, temporary video files are unlinked immediately.
6. **`failed`**: Browser crashes or corrupted streams are logged without failing the overall verification pipeline.

---

## 3. Storage Costs & Retention Budgeting

Video artifacts consume significantly more disk space than screenshots or text logs. Planning storage budgets avoids unexpected disk exhaustion:

### Approximate WebM (VP8/VP9) File Sizes:
- **720p (1280x720) @ 25fps**: ~15 KB – 35 KB per second (~200 KB for a 10s test).
- **1080p (1920x1080) @ 30fps**: ~40 KB – 80 KB per second (~600 KB for a 10s test).

### Projection (100 Runs with 6 Tests Each):
- With `mode: "all"` @ 720p: $100 \times 6 \times 200\text{ KB} \approx 120\text{ MB}$.
- With `mode: "only-on-failure"` (assuming 5% failure rate): $100 \times 6 \times 0.05 \times 200\text{ KB} \approx 6\text{ MB}$ (**95% reduction**).

### Automated Retention Cleaner:
PROOFix includes an automated retention cleaner (`enforceVideoRetention`):
- Purges videos older than `maxAgeDays` (default: 14 days).
- Enforces `maxTotalStorageMb` quota using an **oldest-first** purge strategy.
- **Active Run Protection**: Video files belonging to active runs (`testing`, `starting`, `analyzing`) are **strictly preserved**, even if old or if total quota is exceeded.

---

## 4. Security & Sensitive Page Content Exposure

Browser video recordings capture everything rendered inside the browser viewport. This introduces potential risks regarding sensitive data exposure:

### Potential Exposure Risks:
1. **Credentials & Tokens**: Passwords typed into visible input fields or tokens rendered in URL parameters.
2. **Customer PII**: Addresses, emails, phone numbers, or mock financial data.
3. **Internal URLs & Headers**: Private IP addresses or internal domain names.

### Protective Mitigations Implemented in PROOFix:
- **Project Ownership Enforcement**: Videos are accessible only by authorized users belonging to the parent project (`verifyProjectOwnership`).
- **Storage Internals Protection**: Client interfaces and APIs never render or leak absolute server disk paths (e.g. `C:\`, `D:\Coding\...`). All access uses sanitized routes.
- **Path Traversal Guards**: Video download endpoints reject path traversal attacks (`..`, `/`, `\`).
- **Test Fixture Sanitation**: Synthetic testbed fixtures must utilize dummy credentials (e.g., `testuser@proofix.dev`).

---

## 5. Handling Unsupported Recording Environments

Some CI/CD container environments (e.g., Docker Alpine containers without media libraries or systems with `--no-sandbox` restrictions) may struggle with video encoding.

### Graceful Fallback:
- PROOFix detects host environment capabilities (`checkVideoRecordingSupport`).
- In environments without WebM encoding support, the runner issues an observable warning and falls back to screenshot-only mode without interrupting the test suite:
  ```text
  [Video Warning] Video recording requested but environment is unsupported. Continuing verification in screenshot mode.
  ```
