/**
 * Distributed Test Lifecycle Trace Coordinator (Contribution 206)
 *
 * Implements end-to-end distributed tracing across all 5 hops of the test pipeline:
 * [API Trigger] -> [Outbox Publisher] -> [Queue Worker] -> [Sandbox Spawn] -> [Playwright Run]
 * with W3C traceparent propagation and automated OTLP export.
 */

import type {
  OTelSpan,
  LifecycleHop,
  LifecycleTrace,
  W3CTraceContext,
} from '../types/otel-tracing.ts';
import { globalTraceContextHandler } from './w3c-trace-context.ts';
import { globalSpanBuffer } from './span-buffer.ts';
import { globalOtlpExporter } from './otlp-exporter.ts';

export class LifecycleTraceSession {
  public readonly traceId: string;
  public readonly testSuite: string;
  public readonly commitSha?: string;
  private readonly spans: OTelSpan[] = [];
  private readonly hopsCompleted: LifecycleHop[] = [];
  private currentParentSpanId?: string;
  private rootSpanId?: string;
  private hasErrors: boolean = false;
  private isFinalized: boolean = false;

  constructor(testSuite: string, commitSha?: string, initialTraceId?: string) {
    this.testSuite = testSuite;
    this.commitSha = commitSha;
    this.traceId = initialTraceId || globalTraceContextHandler.generateTraceId();
  }

  public getTraceContext(): W3CTraceContext {
    return {
      version: '00',
      traceId: this.traceId,
      spanId: this.currentParentSpanId || globalTraceContextHandler.generateSpanId(),
      traceFlags: '01',
    };
  }

  public getTraceParentHeader(): string {
    return globalTraceContextHandler.formatTraceParent(this.getTraceContext());
  }

  /**
   * Records execution of one of the 5 pipeline hops.
   */
  public recordHop(
    hop: LifecycleHop,
    durationMs: number,
    attributes: Record<string, string | number | boolean> = {},
    error?: Error | string
  ): OTelSpan {
    const spanId = globalTraceContextHandler.generateSpanId();
    if (!this.rootSpanId) {
      this.rootSpanId = spanId;
    }

    const now = process.hrtime.bigint();
    const durationNano = BigInt(Math.round(durationMs * 1_000_000));
    const startTimeNano = now - durationNano;

    let kind: OTelSpan['kind'] = 'INTERNAL';
    if (hop === 'api_trigger') kind = 'SERVER';
    else if (hop === 'outbox_publisher') kind = 'PRODUCER';
    else if (hop === 'queue_worker') kind = 'CONSUMER';
    else if (hop === 'playwright_run') kind = 'CLIENT';

    const span: OTelSpan = {
      traceId: this.traceId,
      spanId,
      parentSpanId: this.currentParentSpanId,
      name: `hop:${hop}`,
      kind,
      startTimeNano,
      endTimeNano: now,
      durationMs,
      attributes: {
        'test.suite': this.testSuite,
        'lifecycle.hop': hop,
        'git.commit_sha': this.commitSha || 'unknown',
        ...attributes,
      },
      events: [],
      status: error
        ? { code: 'ERROR', description: typeof error === 'string' ? error : error.message }
        : { code: 'OK' },
    };

    if (error) {
      this.hasErrors = true;
      const msg = typeof error === 'string' ? error : error.message;
      span.events.push({
        name: 'exception',
        timestampNano: now,
        attributes: { 'exception.message': msg },
      });
    }

    this.spans.push(span);
    this.hopsCompleted.push(hop);
    globalSpanBuffer.recordSpan(span);

    // Chain child spans hierarchically
    this.currentParentSpanId = spanId;
    return span;
  }

  /**
   * Finalizes the 5-hop lifecycle trace and triggers OTLP export.
   */
  public async finalize(): Promise<LifecycleTrace> {
    if (this.isFinalized) {
      throw new Error(`Trace ${this.traceId} is already finalized`);
    }

    const totalDurationMs = this.spans.reduce(
      (sum, s) => sum + (s.durationMs || 0),
      0
    );

    let otlpExported = false;
    if (globalSpanBuffer.shouldSample(this.traceId)) {
      await globalOtlpExporter.exportSpans(this.spans);
      otlpExported = true;
    }

    this.isFinalized = true;

    return {
      traceId: this.traceId,
      testSuite: this.testSuite,
      commitSha: this.commitSha,
      rootSpanId: this.rootSpanId || '0000000000000000',
      spans: [...this.spans],
      hopsCompleted: [...this.hopsCompleted],
      totalDurationMs: +totalDurationMs.toFixed(2),
      hasErrors: this.hasErrors,
      otlpExported,
    };
  }
}

export class LifecycleTracer {
  /**
   * Starts a new 5-hop lifecycle trace session.
   */
  public startSession(
    testSuite: string,
    options: { commitSha?: string; traceId?: string } = {}
  ): LifecycleTraceSession {
    return new LifecycleTraceSession(testSuite, options.commitSha, options.traceId);
  }
}

export const globalLifecycleTracer = new LifecycleTracer();
