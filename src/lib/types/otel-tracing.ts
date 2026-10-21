/**
 * OpenTelemetry (OTel) Distributed Tracing Engine Types (Contribution 201)
 *
 * Implements W3C Trace Context (traceparent, tracestate) and OTel span primitives
 * for tracing the end-to-end test execution lifecycle across API, Outbox, Queue, Sandbox, and Playwright.
 */

export type SpanKind =
  | 'INTERNAL'
  | 'SERVER'
  | 'CLIENT'
  | 'PRODUCER'
  | 'CONSUMER';

export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR';

export interface SpanStatus {
  code: SpanStatusCode;
  description?: string;
}

export interface SpanEvent {
  name: string;
  timestampNano: bigint | number;
  attributes?: Record<string, string | number | boolean>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  traceState?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface W3CTraceContext {
  version: string; // '00'
  traceId: string; // 32 hex chars (16 bytes)
  spanId: string; // 16 hex chars (8 bytes)
  traceFlags: string; // '01' (sampled) or '00'
  traceState?: string;
}

export interface OTelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTimeNano: bigint | number;
  endTimeNano?: bigint | number;
  durationMs?: number;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  status: SpanStatus;
  links?: SpanLink[];
}

export type LifecycleHop =
  | 'api_trigger'
  | 'outbox_publisher'
  | 'queue_worker'
  | 'sandbox_spawn'
  | 'playwright_run';

export interface LifecycleTrace {
  traceId: string;
  testSuite: string;
  commitSha?: string;
  rootSpanId: string;
  spans: OTelSpan[];
  hopsCompleted: LifecycleHop[];
  totalDurationMs: number;
  hasErrors: boolean;
  otlpExported: boolean;
}

export interface OtlpExportConfig {
  endpoint: string; // e.g. http://localhost:4318/v1/traces
  protocol: 'http/json' | 'http/protobuf';
  serviceName: string;
  headers?: Record<string, string>;
  exportTarget: 'jaeger' | 'datadog' | 'tempo' | 'local_collector';
  sampleRate: number; // 0.0 to 1.0
}
