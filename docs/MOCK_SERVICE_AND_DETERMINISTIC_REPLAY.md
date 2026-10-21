# Mock Service & Deterministic Third-Party Replay

PROOFix Point 5 (Contributions 141–150) introduces deterministic third-party mock recording and replay to eliminate network flakiness in CI pipelines when interacting with external SaaS providers (Stripe, GitHub, OpenAI, Twilio, Auth0).

---

## 1. Architectural Overview

```
                      [Application Outbound Network Call]
                           (fetch / http / https)
                                     │
                                     ▼
                    [Network Proxy & Interceptor Bridge]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        [Replay Mode Active]                   [Record Mode Active]
                 │                                       │
                 ▼                                       ▼
       [Interaction Matcher]                   [Live Outbound Fetch]
        - Canonical SHA-256                              │
        - Sequential FIFO Polling                        ▼
        - Fuzzy JSON Key Overlap               [Secret & PII Scrubber]
                 │                              - Stripe/GitHub/AWS Keys
                 ▼                              - Bearer Tokens, Passwords
      [Chaos Fault Injection]                   - Credit Cards, CVV
        - 429 Rate Limit (Retry-After)                   │
        - 503 Gateway Outage                             ▼
        - Artificial Latency Delay             [Cassette Storage Engine]
        - ECONNRESET / ETIMEDOUT                (.proofix/cassettes/*.json)
                 │
                 ▼
     [Deterministic Mock Response]
      (Zero external network traffic)
```

---

## 2. Key Capabilities & Components

### 1. Types & Schema (`src/lib/types/mock-replay.ts`)
- Defines `TrafficCassette`, `CassetteInteraction`, `RecordedRequest`, `RecordedResponse`, `FaultInjectionRule`, and `ReplaySessionStats`.
- Replay modes: `replay` (deterministic mock), `record` (record live traffic), `auto` (replay if matched, else record), `passthrough` (direct network).

### 2. Request Normalizer, Canonical Hasher & Secret Scrubber (`src/lib/replay/request-normalizer.ts`)
- Canonicalizes query parameters and JSON body keys alphabetically.
- Removes volatile, non-deterministic headers (`date`, `user-agent`, `x-request-id`, `traceparent`).
- Computes SHA-256 fingerprint: `METHOD:PATH:QUERY:HEADERS:BODY`.
- Masks credentials, API keys, passwords, and credit card numbers before saving to disk.

### 3. Cassette Storage Engine (`src/lib/replay/cassette-storage.ts`)
- Safely manages cassette files in `.proofix/cassettes/`.
- Automatic provider inference from hostnames (`api.stripe.com` -> `stripe`).
- Appends interactions with sequential ordering.

### 4. Deterministic Interaction Matcher (`src/lib/replay/interaction-matcher.ts`)
- Exact canonical body hash matching.
- Sequential FIFO matching for multiple identical requests (e.g. polling status from `pending` to `ready`).
- Fuzzy JSON similarity fallback using Jaccard key overlap coefficients.

### 5. Fault & Chaos Injection Engine (`src/lib/replay/fault-injector.ts`)
- Injects simulated upstream outages without altering application code:
  - `rate_limit_429`: Simulates HTTP 429 with custom `Retry-After` headers.
  - `http_status_override`: Simulates HTTP 503 Service Unavailable or 502 Bad Gateway.
  - `delay_latency`: Injects artificial network latency (e.g. 500ms).
  - `connection_reset` & `timeout`: Throws `ECONNRESET` or `ETIMEDOUT`.
  - `corrupted_json`: Truncates responses to verify frontend error boundaries.

### 6. Outbound Network Proxy & Interceptor Bridge (`src/lib/replay/network-interceptor.ts`)
- Replaces or wraps `globalThis.fetch` dynamically during test execution.
- Prevents external network leaks in strict replay mode.

### 7. SaaS Provider Presets (`src/lib/replay/provider-presets.ts`)
- Out-of-the-box cassettes and fault profiles for standard SaaS platforms:
  - **Stripe**: Payment intent success, card declined (insufficient funds), 429 rate limit.
  - **GitHub**: Pull request details, user profile, secondary rate limit (HTTP 403).
  - **OpenAI**: Chat completions, quota exceeded (HTTP 429).
  - **Twilio**: SMS queued/sent, delivery failure.

### 8. Mock Replay Service & REST API (`src/lib/replay/mock-replay-service.ts`, `/api/v1/replay`)
- Unified session manager tracking replay hit rates and active chaos rules.
- REST endpoints for starting, stopping, and inspecting replay sessions.

### 9. Interactive Dashboard UI (`src/components/replay/MockReplayDashboard.tsx`)
- Visual mode switcher, cassette interaction inspector with scrubbed credentials, and chaos fault simulator toggles.

---

## 3. Running Verification Tests

Run the master Mock Replay CI regression suite:
```bash
npm run test:replay
```
Or execute directly with Node:
```bash
node tests/verify-mock-replay-ci.mjs
```
