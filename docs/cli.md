# PROOFix CLI Reference

The PROOFix Command Line Interface (`proofix`) provides terminal-based repository inspection, engine telemetry monitoring, and route pre-flight verification.

---

## Installation & Usage

You can run the CLI via `npx` or directly from the project directory:

```bash
# Using npx
npx proofix --help

# Or via npm script / local bin
node bin/proofix.js status
```

---

## Commands

### 1. `proofix status`
Checks whether a local PROOFix verification engine daemon is active on ports 3000 or 3001, printing engine version and supported AI providers.

```bash
$ proofix status
✓ PROOFix Engine active on port 3001!
  Version:      1.0.0
  Tagline:      Don't just generate code. Prove that it works.
  Capabilities: {"browserTesting":"Playwright (Chromium)","executionIsolation":"local_process_sandbox"}
```

---

### 2. `proofix analyze [path]`
Inspects any repository folder without modifying source files. Detects framework, package manager, scripts, entry points, and discovered App Router or Pages Router routes.

```bash
$ proofix analyze ./my-app

✓ Framework Detected: Next.js (15.x)
✓ Package Manager:    npm
✓ Scripts Found:      dev, build, start, test

--- Discovered Routes (4) ---
  [PAGE] /
  [PAGE] /about
  [PAGE] /dashboard
  [API ] /api/health
```

---

### 3. `proofix verify [path]`
Executes pre-flight route auditing and verifies readiness path configuration before triggering automated Playwright browser tests.
