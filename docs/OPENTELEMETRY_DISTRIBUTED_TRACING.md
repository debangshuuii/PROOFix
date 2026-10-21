# 🔭 OpenTelemetry (OTel) Distributed Tracing Engine

## Architecture & 5-Hop Lifecycle Flow
PROOFix implements native W3C Trace Context propagation and OpenTelemetry span instrumentation across all 5 hops of the test execution pipeline:

```
┌─────────────────┐       W3C traceparent       ┌────────────────────┐
│   API Trigger   │ ──────────────────────────► │  Outbox Publisher  │
│    (SERVER)     │                             │     (PRODUCER)     │
└────────┬────────┘                             └─────────┬──────────┘
         │                                                │
         │                                                ▼
         │                                      ┌────────────────────┐
         │                                      │    Queue Worker    │
         │                                      │     (CONSUMER)     │
         │                                      └─────────┬──────────┘
         │                                                │
         │                                                ▼
         │                                      ┌────────────────────┐
         │                                      │   Sandbox Spawn    │
         │                                      │     (INTERNAL)     │
         │                                      └─────────┬──────────┘
         │                                                │
         │                                                ▼
         │         W3C traceparent injection    ┌────────────────────┐
         └────────────────────────────────────► │   Playwright Run   │
                                                │      (CLIENT)      │
                                                └─────────┬──────────┘
                                                          │
                                                          ▼
                                                ┌────────────────────┐
                                                │   OTLP Exporter    │
                                                │ (Jaeger/Tempo/DD)  │
                                                └────────────────────┘
```

## Features Implemented (Contributions 201–210)

1. **W3C Trace Context Specification (`src/lib/telemetry/w3c-trace-context.ts`)**:
   - `traceparent` (version `00`, 16-byte TraceId, 8-byte SpanId, `01` sampled flag).
   - `tracestate` comma-separated opaque vendor list propagation.
   - Cryptographic non-zero ID generator.

2. **High-Resolution Monotonic Span Tracer (`src/lib/telemetry/span-tracer.ts`)**:
   - Nanosecond clock resolution via `process.hrtime.bigint()`.
   - `ActiveSpan`: `setAttribute`, `addEvent`, `setStatus`, `recordException`, `end`.
   - Auto-computes duration and status transitions.

3. **In-Memory Ring Buffer & Adaptive Sampling (`src/lib/telemetry/span-buffer.ts`)**:
   - Head-based probabilistic sampling.
   - Tail-based adaptive sampling: guarantees 100% retention for traces with `ERROR` status or latency exceeding threshold (e.g. > 3000ms).
   - Capacity-bounded ring buffer eviction.

4. **OTLP/HTTP Protocol Exporter (`src/lib/telemetry/otlp-exporter.ts`)**:
   - Standard OTLP v1/traces JSON schema export with resourceSpans, scopeSpans, semantic convention attributes, and timing conversions.
   - Configurable export targets: **Jaeger** (`:4318`), **Datadog APM**, **Grafana Tempo**.

5. **Distributed 5-Hop Lifecycle Coordinator (`src/lib/telemetry/lifecycle-tracer.ts`)**:
   - Traces the complete lifecycle from API trigger to Playwright test execution with hierarchical parent span chaining.

6. **Playwright W3C Network Header Injector (`src/lib/telemetry/playwright-trace-injector.ts`)**:
   - Injects `traceparent` and `tracestate` into browser `extraHTTPHeaders`.
   - Captures DOM Performance timings (LCP, CLS, FCP) and browser console exceptions as span events.

7. **OTLP Collector Receiver Endpoint (`src/app/api/v1/telemetry/otlp/v1/traces/route.ts`)**:
   - Ingests standard OTLP/HTTP traces and allows querying spans by `traceId`.

8. **Distributed Tracing Waterfall & Flamegraph UI (`src/components/telemetry/DistributedTraceWaterfall.tsx`)**:
   - Interactive Gantt chart of all 5 hops, duration bars, event pins, attribute inspector drawer, and live trace simulation.
   - Route: `/telemetry`.

9. **Automated CI Suite**:
   - `npm run test:otel` (`tests/verify-distributed-tracing-ci.mjs`).
