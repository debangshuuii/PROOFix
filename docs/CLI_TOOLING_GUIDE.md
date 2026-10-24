# PROOFix CLI Developer Tooling & Diagnostics Manual

Elevates PROOFix from a web dashboard into an industrial-grade command-line developer tool for local verification, environmental diagnostics, and autonomous AI self-healing.

---

## 1. Quick Start

PROOFix is executable directly via `npx` or by linking locally:

```bash
# Run environmental health diagnostics
npx proofix doctor

# Run interactive 11-stage verification pipeline
npx proofix run --interactive --scenario ecommerce_checkout

# Review and apply AI self-repair patch
npx proofix fix --scenario ecommerce_checkout

# Start local watch mode (auto-reruns tests on save)
npx proofix watch
```

---

## 2. Commands & Subcommands

### `npx proofix doctor`
Conducts environmental diagnostics before executing browser journeys.

- **Node.js Runtime Check:** Validates Node version satisfies `>= 20.0.0`.
- **Playwright Chromium Binary Detection:** Locates local browser cache and checks browser executable.
- **Auto-Healing (`--heal`):** Automatically downloads missing Chromium binaries via `npx playwright install chromium`.
- **Ephemeral Port Allocation:** Tests loopback socket binding (`127.0.0.1:0`) and socket release.
- **AI Provider API Keys:** Inspects presence of `GEMINI_API_KEY` or `OPENAI_API_KEY`, safely masking credentials. Activates deterministic heuristic fallback mode if keys are absent.
- **Options:**
  - `--heal`: Automatically triggers browser installation if binaries are missing.
  - `--json`: Outputs machine-readable JSON report.

```bash
npx proofix doctor --heal
```

---

### `npx proofix run`
Executes PROOFix's comprehensive 11-stage verification pipeline against target repositories or benchmark defect scenarios.

- **11 Verification Stages:**
  1. `Preflight Static Analysis`
  2. `Mock Contract Replay`
  3. `Action Journey Simulation`
  4. `Visual Pixel Regression`
  5. `WCAG 2.1 AA Accessibility`
  6. `Lighthouse Performance Audit`
  7. `Semantic Vision & Layout`
  8. `API Fuzzing & Boundaries`
  9. `Security Preflight Blocker Gate`
  10. `OpenTelemetry Distributed Tracing`
  11. `Autonomous Self-Healing Repair`
- **Interactive TUI Mode (`-i, --interactive`):** Renders an animated progress bar, active stage indicator, elapsed duration counter, and real-time streaming log buffer.
- **Options:**
  - `-s, --scenario <id>`: Target specific scenario (`ecommerce_checkout`, `hydration_mismatch`, `sql_injection_preflight`).
  - `--headless`: Run Playwright browser headless.
  - `--bail`: Stop execution immediately on the first failed stage.
  - `--json`: Emit full execution result as JSON.

```bash
npx proofix run --interactive --scenario ecommerce_checkout
```

---

### `npx proofix fix`
Interactive patch review and atomic self-healing patch applicator.

- **Terminal Patch Review:** Prompts user with `[y/N/diff/help]`:
  - `y`: Apply patch immediately to working tree.
  - `n`: Discard proposal and keep repository unchanged.
  - `diff`: Render full ANSI color-coded unified diff with line numbers and stats (`+` additions, `-` deletions).
  - `help`: Display shortcuts description.
- **Atomic Safety & Backups:** Creates `<file>.proofix.bak` backup and logs to `.proofix/patch-backups.json`.
- **Options:**
  - `--apply`: Automatically apply patch without prompting (ideal for CI).
  - `--rollback`: Revert previously applied patch using local backups.
  - `-s, --scenario <id>`: Target specific defect scenario.

```bash
# Review patch with interactive diff prompt
npx proofix fix --scenario ecommerce_checkout

# Instant apply
npx proofix fix --scenario ecommerce_checkout --apply

# Rollback
npx proofix fix --scenario ecommerce_checkout --rollback
```

---

### `npx proofix watch`
Local file watcher re-running Playwright journeys automatically on file save (analogous to Vitest / Jest watch mode).

- **Noise Filtering:** Automatically ignores `.git`, `node_modules`, `.next`, `.proofix`, and temporary files.
- **Configurable Debounce:** Batches rapid saves within `--debounce <ms>` (default 300ms).
- **Intelligent Journey Mapping:**
  - Changes in `*checkout*` / `*cart*` trigger the E-Commerce journey.
  - Changes in `*clock*` / `*hydration*` trigger the SSR Hydration journey.
  - Changes in `*search*` / `*sql*` trigger the Security Preflight journey.
- **Interactive Terminal Hotkeys:**
  - `r`: Re-run last active journey immediately.
  - `a`: Re-run all test journeys.
  - `d`: Run host doctor diagnostics.
  - `c`: Clear terminal screen.
  - `h`: Show hotkeys help.
  - `q`: Gracefully stop watcher and quit.

```bash
npx proofix watch --debounce 400
```

---

### `npx proofix analyze [dir]`
Scans target directory to detect:
- Framework (Next.js App Router, Pages Router, Vite, etc.)
- Package manager (`npm`, `pnpm`, `yarn`, `bun`)
- Discovered UI and API routes with source file mapping.

---

### `npx proofix status`
Probes local ports (`3000`, `3001`, `8080`) for running PROOFix verification engine instances, reporting active version and capabilities.

---

## 3. Automated Test Suite

Run the full CLI CI verification suite covering all 14 stages:

```bash
npm run test:cli
```
