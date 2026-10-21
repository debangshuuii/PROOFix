# Real-Time Interactive Companion & Live Browser Mirroring

PROOFix Point 3 (Contributions 121–130) introduces full interactive live inspection of Playwright browser execution runs. Developers and QA engineers can mirror headless browser screencasts in real time, set conditional breakpoints, pause on failures, step forward through individual journey actions, and observe live DOM mutations as they happen.

---

## 1. Architectural Highlights

```
                                 [Playwright Browser Runner]
                                              │
                      ┌───────────────────────┼────────────────────────┐
                      ▼                       ▼                        ▼
           [Viewport Screencast]     [Journey Stepper Barrier]    [DOM Mutation Tracker]
             (FPS Throttling)          (Conditional Breakpoints)     (Noise Filter)
                      │                       │                        │
                      └───────────────────────┼────────────────────────┘
                                              ▼
                                 [Telemetry Broadcaster]
                                    (Pub/Sub Registry)
                                              │
                                              ▼
                                 [Server-Sent Events (SSE)]
                                  GET /api/v1/runs/:id/live
                                              │
                      ┌───────────────────────┴────────────────────────┐
                      ▼                                                ▼
           [Live Screencast Mirror]                        [Real-Time Action Controls]
             (HTML5 Canvas/Image)                          POST /api/v1/runs/:id/control
                                                           (pause, resume, step_next)
```

### Components (Contributions 121–130):
1. **Types & Schema (`src/lib/types/live-companion.ts`)**
   - Telemetry event model (`CompanionTelemetryEvent`, `ViewportFramePayload`, `DomMutationRecord`, `CompanionBreakpoint`).
   - Execution states: `running`, `paused`, `breakpoint_hit`, `completed`, `error`.
2. **Telemetry Broadcaster (`src/lib/companion/telemetry-broadcaster.ts`)**
   - Memory-safe pub/sub engine formatting real-time payloads into standards-compliant SSE (`text/event-stream`).
   - Multi-subscriber support with automatic teardown on client disconnect.
3. **Conditional Breakpoint Manager (`src/lib/companion/breakpoint-manager.ts`)**
   - Breakpoint rules: `always`, `on_failure`, `url_match`, `dom_selector_exists`.
   - Dynamic activation/deactivation during in-flight runs.
4. **Step Controller & Execution Barrier (`src/lib/companion/step-controller.ts`)**
   - Barrier promise synchronizer allowing headless Playwright tests to pause indefinitely and await user step-over or resume signals without timing out.
5. **Viewport Frame Streamer (`src/lib/companion/frame-streamer.ts`)**
   - Captures Playwright browser CDP screencast buffers, applies adaptive FPS throttling (default 10-15 FPS), and emits base64 data URLs.
6. **DOM Mutation Tracker (`src/lib/companion/dom-mutation-tracker.ts`)**
   - Observes DOM tree mutations (`childList`, `attributes`, `characterData`) and pre-filters browser noise (analytics tags, tracker pixels, metric counters).
7. **Companion Session Manager (`src/lib/companion/companion-session-manager.ts`)**
   - Coordinates broadcaster, step controller, frame streamer, and mutation tracker per verification run ID.
8. **Live Streaming & Control API Routes (`src/app/api/v1/runs/[id]/live/route.ts`, `control/route.ts`)**
   - Streaming SSE endpoint with `Cache-Control: no-cache, no-transform`.
   - Control dispatch endpoint accepting `pause`, `resume`, `step_next`, and `set_breakpoint`.
9. **Companion Dashboard UI (`src/components/companion/LiveCompanionDashboard.tsx`)**
   - Live screencast canvas mirror, HUD overlay, execution stepper toolbar, real-time telemetry log feed, DOM mutation cards, and breakpoint manager.
   - Integrated into verification run detail view (`src/app/projects/[id]/runs/[runId]/page.tsx`).
10. **Master CI Regression Suite (`tests/verify-live-companion-ci.mjs`)**
    - 9-stage end-to-end automated verification verifying all companion primitives.

---

## 2. API Endpoints

### `GET /api/v1/runs/:id/live`
Subscribes to the real-time Server-Sent Events stream for the specified run.

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

**SSE Event Types:**
- `state_change`: Notifies changes in execution status (`paused`, `running`, `breakpoint_hit`).
- `step_start` / `step_complete`: Notifies journey step progression with selectors and action types.
- `viewport_frame`: Emits latest browser screencast frame data URL with resolution metadata.
- `dom_mutation`: Transmits filtered DOM changes caused by the current action.
- `console_log`: Real-time browser devtools console outputs.

---

### `POST /api/v1/runs/:id/control`
Dispatches execution commands to the live browser session barrier.

**Request Body:**
```json
{
  "action": "pause" | "resume" | "step_next" | "set_breakpoint" | "remove_breakpoint",
  "params": {
    "stepIndex": 4,
    "condition": "on_failure"
  }
}
```

---

## 3. Running the Verification Suite

Run the master CI test suite:
```bash
npm run test:companion
```
Or execute directly:
```bash
node tests/verify-live-companion-ci.mjs
```
