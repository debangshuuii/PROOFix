# Enterprise UI/UX & Developer Experience (Pillar 5)

## Overview

The **Enterprise UI/UX & Developer Experience** subsystem transforms PROOFix into a developer-first, enterprise-grade verification platform. Delivered across 100 atomic contributions, this milestone provides seamless responsiveness, universal accessibility, instant search indexing, real-time log inspection, and machine-readable API specifications.

---

## 1. Mobile Navigation & Theme Switcher

### 1.1 Responsive Mobile Navigation Drawer (`< 768px`)
- **Component**: [`src/components/navigation/MobileNavigationDrawer.tsx`](../src/components/navigation/MobileNavigationDrawer.tsx)
- **Trigger**: [`src/components/navigation/HamburgerButton.tsx`](../src/components/navigation/HamburgerButton.tsx)
- **Features**:
  - Automatically hidden on viewports `≥ 768px` (`md:hidden`) and active on mobile screens (`< 768px`).
  - Slide-in navigation drawer with backdrop blur and body scroll lock.
  - Keyboard accessible: closes on `Escape` key press.
  - Viewport resize listener: automatically closes drawer if viewport width expands to desktop `≥ 768px`.
  - Accessible ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="mobile-nav-title"`, `aria-expanded`.
  - Full route hierarchy coverage: Core Platform (Dashboard, Projects, Operations Hub, API Reference) and Enterprise Modules (Sandbox, Queues, SOC2 Governance, Settings).

### 1.2 Multi-Theme Persistence Engine (`ThemeProvider.tsx`)
- **Component**: [`src/components/theme/ThemeProvider.tsx`](../src/components/theme/ThemeProvider.tsx)
- **UI Switcher**: [`src/components/theme/ThemeSwitcher.tsx`](../src/components/theme/ThemeSwitcher.tsx)
- **Modes**: `dark`, `light`, `system`
- **Features**:
  - Zero-FOUC (Flash of Unstyled Content) initialization from `localStorage.getItem('proofix_theme')`.
  - Real-time `matchMedia('(prefers-color-scheme: dark)')` listener dynamically synchronizing theme when the operating system switches between dark and light modes.
  - Root DOM synchronization: applies `.dark` / `.light` class, `data-theme="dark|light"`, and `color-scheme` CSS style.
  - Tailored CSS design variables in `globals.css` with modern dark slate and crisp daylight contrast palettes.

---

## 2. Global Command Palette (`CommandPaletteModal.tsx`)

### 2.1 Universal Fuzzy Search Indexing
- **Component**: [`src/components/navigation/CommandPaletteModal.tsx`](../src/components/navigation/CommandPaletteModal.tsx)
- **Indexer Singleton**: [`src/lib/navigation/command-indexer.ts`](../src/lib/navigation/command-indexer.ts)
- **Shortcuts**: `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)
- **Expanded Entities**:
  1. **Active Projects**: Indexed via [`project-indexer.ts`](../src/lib/navigation/project-indexer.ts) with repository URL, default branch, and last run status badges (`PASSED`, `FAILED`, `RUNNING`).
  2. **Recent Execution Runs**: Indexed via [`run-indexer.ts`](../src/lib/navigation/run-indexer.ts) with pass/fail counts, execution durations in seconds, and commit hashes.
  3. **Failing Tests**: Indexed via [`failure-indexer.ts`](../src/lib/navigation/failure-indexer.ts) with error message snippets, broken assertion tokens, and direct navigation links to the failures tab.
  4. **AI Fix Proposals**: Indexed via [`proposal-indexer.ts`](../src/lib/navigation/proposal-indexer.ts) with confidence percentage badges (e.g. `94% CONF`), target file diffs, and remediation summaries.
  5. **Static Enterprise Tools**: Operations hub, sandbox cgroups, DLQ redrive, and SOC2 evidence export.

### 2.2 Advanced Keyboard State Machine
- `Tab` / `Shift+Tab`: Forward and backward category cycling across all 8 filters (All, Projects, Runs, Failing Tests, Fix Proposals, Enterprise, Testing, Security).
- `ArrowDown` / `ArrowUp`: Wrap-around list navigation.
- `Home` / `End`: Instant jump to the top or bottom of search results.
- `Escape`: Instant modal dismissal.
- Action Executor: Routes to target paths or dispatches custom `proofix:command-action` events.

---

## 3. Streaming Virtualized Terminal for Run Execution

### 3.1 Architecture Overview
- **Component**: [`src/components/terminal/StreamingTerminal.tsx`](../src/components/terminal/StreamingTerminal.tsx)
- Replaces static, unvirtualized log displays in the run inspection view (`/projects/[id]/runs/[runId]`).
- Bounded memory usage via [`RingBufferStream`](../src/lib/terminal/ring-buffer-stream.ts) supporting 50,000+ line logs without browser memory degradation.

### 3.2 ANSI Sequence Parser & Tokenizer
- **Module**: [`src/lib/terminal/ansi-parser.ts`](../src/lib/terminal/ansi-parser.ts)
- Translates ANSI SGR escape sequences into structured `AnsiToken[]`.
- Full support for standard 16 foreground/background colors, 256-color palette (`\x1b[38;5;Nm`), bold (`1`), dim (`2`), italic (`3`), underline (`4`), and reset (`0`).
- Provides clean plain-text stripping via `AnsiParser.stripAnsi()`.

### 3.3 Log Level Classification
- **Module**: [`src/lib/terminal/log-classifier.ts`](../src/lib/terminal/log-classifier.ts)
- Automatic log severity categorization:
  - `ERROR`: Stack traces, `AssertionError`, `FAIL`, `TypeError`, non-zero exit codes.
  - `WARN`: Deprecations, retries, backoff warnings.
  - `INFO`: Standard lifecycle, test completions.
  - `DEBUG`: Cgroups metrics, PID allocations, verbose logs.
  - `TRACE`: Raw wire events and frame dumps.

### 3.4 Auto-Scroll Lock & Virtual Window
- **Auto-Scroll Button**: [`src/components/terminal/AutoScrollLockButton.tsx`](../src/components/terminal/AutoScrollLockButton.tsx)
  - `Follow Tail`: Sticky-pinned to the bottom; automatically scrolls down as live SSE stream chunks arrive.
  - `Resume Tail`: When the user scrolls up past 60px to inspect earlier logs, auto-scroll pauses. Clicking "Resume Tail" smoothly returns to bottom and re-locks.
- **Virtualized Viewport**: [`src/lib/terminal/virtual-window.ts`](../src/lib/terminal/virtual-window.ts) renders only visible rows (fixed 22px height) + overscan buffer.
- **Regex Search & Highlight**: [`src/lib/terminal/search-matcher.ts`](../src/lib/terminal/search-matcher.ts) provides real-time search with case-sensitivity and regex matching.

---

## 4. OpenAPI 3.1 & Interactive Documentation Hub (`/docs`)

### 4.1 OpenAPI 3.1 Specification Engine
- **Master Generator**: [`src/lib/openapi/spec-generator.ts`](../src/lib/openapi/spec-generator.ts)
- Generates compliant **OpenAPI 3.1.0** document covering all 15 REST modules:
  - `Projects`: Repositories, configs, branches.
  - `Runs`: Execution dispatch, run cancellation, SSE live streaming.
  - `Findings`: Functional regressions, console errors, step traces.
  - `Proposals`: AI-generated AST code patches and confidence ratings.
  - `Sandbox`: Linux cgroups v2 resource quotas.
  - `Governance`: SHA-256 immutable audit ledger.
  - `Webhooks`: Outbound HTTP notification hooks.
  - `Health`: Liveness and readiness probes.
  - `Crawler`: Autonomous route discovery.
  - `Fuzzing`: API boundary probes and SQLi stress tests.
  - `Replay`: Deterministic HAR network mocking.
  - `Companion`: Sub-millisecond WebRTC remote browser streaming.

### 4.2 REST Endpoints
- `GET /api/v1/openapi.json`: Returns live JSON OpenAPI 3.1 specification with CORS enabled.
- `GET /api/v1/openapi.yaml`: Returns YAML serialized specification via zero-dependency [`yaml-serializer.ts`](../src/lib/openapi/yaml-serializer.ts).

### 4.3 Interactive Reference Hub (`/docs`)
- **Page**: [`src/app/docs/page.tsx`](../src/app/docs/page.tsx)
- Scalar/Swagger-style interactive layout:
  - **Sidebar Navigation**: Grouped by platform tags with HTTP method badges.
  - **Filter Bar**: Real-time search across endpoints and verbs.
  - **Try-It-Out Console**: Live browser execution with parameter inputs, request body editor, status code badges, and latency tracking in milliseconds.
  - **Code Snippet Generator**: Multi-language code samples for `cURL`, `JavaScript`, `Python`, and `Node.js`.

---

## 5. Verification & Testing

Run the master CI verification suite covering all 100 contributions:

```bash
npm run test:ui:enterprise
```
