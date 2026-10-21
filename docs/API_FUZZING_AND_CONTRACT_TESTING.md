# API Fuzzing & Contract Boundary Testing

PROOFix Point 4 (Contributions 131–140) introduces automated API contract fuzzing, adversarial boundary injection, and vulnerability classification for Next.js App Router and OpenAPI 3.0/3.1 endpoints.

---

## 1. Architecture Overview

```
                 [OpenAPI 3.0 / Next.js Route Sniffer]
                                  │
                                  ▼
                     [Endpoint Contract Registry]
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[Boundary & Type Mutator]                       [Adversarial Security Mutator]
 - Number min - 1, max + 1                       - SQLi Tautologies & Sleep
 - 32/64-bit Integer Overflow                    - XSS Polyglot Payloads
 - Empty / Oversized Strings                     - Embedded Null Bytes (\x00)
 - Array/Object Type Confusion                   - Unicode Homoglyphs & RTL
 - Null / Missing Required Values                - Auth Tampering & IP Spoofs
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  ▼
                   [Safe HTTP Fuzzing Executor]
                    (Concurrency Throttling)
                    (Timeout & Circuit Breaker)
                                  │
                                  ▼
               [Contract Anomaly & CWE Classifier]
                 - CWE-209: Stack Trace Leaks
                 - CWE-754: 500 Unhandled Exceptions
                 - CWE-287: Authentication Bypass
                 - CWE-20: Security Vector Acceptance
                 - CWE-400: ReDoS / Latency Spikes
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[Actionable cURL Reproducers]                  [Health Score & Dashboard UI]
 (Copy-pasteable CLI commands)                  (Visual Contract Report)
```

---

## 2. Key Capabilities & Components

### 1. Types & Fuzz Strategy Taxonomy (`src/lib/types/api-fuzzing.ts`)
- Strategy types: `boundary_values`, `type_confusion`, `null_byte_injection`, `unicode_homoglyphs`, `sqli_adversarial`, `xss_adversarial`, `oversized_payload`, `schema_violation`, `auth_tampering`, `rate_limit_probe`.
- Anomaly categories: `unhandled_server_exception`, `contract_schema_mismatch`, `security_validation_bypass`, `unauthenticated_leak`, `performance_degradation`, `unexpected_status_code`, `information_disclosure`.

### 2. OpenAPI / JSON Schema Contract Parser (`src/lib/fuzzing/contract-parser.ts`)
- Parses OpenAPI 3.0 / 3.1 specifications.
- Recursively dereferences local `#/components/schemas/...` pointers.
- Extracts path parameters, query parameters, headers, and requestBody schemas.

### 3. Boundary Value & Type Confusion Mutator (`src/lib/fuzzing/payload-mutator.ts`)
- Tests boundary conditions: `0`, `-1`, `min - 1`, `max + 1`, `2^31 - 1`, `2^53 - 1`, empty strings, and oversized strings.
- Injects type confusion vectors: arrays where strings expected, objects where integers expected, and explicit nulls.

### 4. Adversarial Security Mutator (`src/lib/fuzzing/adversarial-mutator.ts`)
- Injects classic and blind SQL injection vectors (`' OR '1'='1`, `pg_sleep`).
- Injects XSS vectors (`<script>`, inline SVG breakout, polyglots).
- Injects null bytes (`\u0000`, `%00`) to expose native library truncations.
- Tests Cyrillic homoglyphs, Bi-Directional text overrides (`\u202E`), zero-width spaces (`\u200B`), and oversized request buffers (64KB, 256KB, 1MB).
- Probes authentication tampering with malformed JWT signatures and header manipulations.

### 5. Safe HTTP Fuzzing Executor (`src/lib/fuzzing/fuzz-executor.ts`)
- Interpolates path parameters (`/api/v1/users/{id}` -> `/api/v1/users/admin%00`).
- Employs a worker pool for concurrency limiting (default 4-5 concurrent workers).
- Tracks microsecond-accurate response latency and captures response headers and body previews safely.

### 6. Anomaly & Vulnerability Classifier (`src/lib/fuzzing/anomaly-classifier.ts`)
- Detects unhandled 500 exceptions, stack trace leaks (CWE-209), authentication bypass (CWE-287), and latency degradation.
- Generates reproducible, copy-pasteable `curl` commands for immediate local developer verification.

### 7. OpenAPI Spec Auto-Synthesizer & Route Sniffer (`src/lib/fuzzing/route-sniffer.ts`)
- Automatically crawls `src/app/api/**/route.ts` files in Next.js codebases.
- Maps `[id]` dynamic segments to OpenAPI path parameters.
- Synthesizes a valid OpenAPI 3.0 document when no external specification exists.

### 8. Fuzzing Audit Orchestrator (`src/lib/fuzzing/fuzz-orchestrator.ts`)
- Coordinates the end-to-end pipeline and computes the **Contract Health Score (0–100%)** based on weighted severity penalties (-25 for critical, -12 for high, -5 for medium).
- Exposed via REST endpoint `GET /api/v1/fuzzing` and `POST /api/v1/fuzzing`.

### 9. Interactive Dashboard UI (`src/components/fuzzing/ApiFuzzingReport.tsx`)
- Visual health score gauge, anomaly cards with CWE badges, one-click copy cURL reproducer buttons, and endpoint matrix inspector.
- Integrated into the PROOFix verification run detail view.

## 3. Mutation Strategies & Anomaly Classifier

### Mutation Strategies:
- **Boundary Values**: Explores limits of numeric and string ranges (e.g. min - 1, max + 1, INT_MAX, empty strings).
- **Type Confusion**: Replaces expected types with incompatible primitives (e.g. arrays for strings, booleans for integers).
- **Null Byte Injection**: Evaluates resilience to embedded `\u0000` and `%00` bytes.
- **SQLi & XSS Vectors**: Probes database parameterization and HTML escaping without destructive payloads.
- **Auth Tampering**: Tests handling of forged, expired, or empty bearer tokens and spoofed headers.

### Anomaly Classifier:
- **CWE-209**: Detects stack traces and internal file paths in error responses.
- **CWE-754 / 500 Exceptions**: Identifies uncaught server crashes on boundary payloads.
- **CWE-287**: Catches authentication bypasses on tampered credentials.
- **CWE-20**: Flags unvalidated acceptance of injection vectors with HTTP 200.
- **CWE-400**: Alerts on significant response latency spikes indicating potential ReDoS or database locks.

---

## 4. Running Verification Tests

Run the master API Fuzzing CI regression suite:
```bash
npm run test:fuzzing
```
Or execute directly with Node:
```bash
node tests/verify-api-fuzzing-ci.mjs
```
