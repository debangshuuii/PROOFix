/**
 * High-Resolution Monotonic Span Tracer & Lifecycle Manager (Contribution 203)
 *
 * Implements OpenTelemetry Span creation, attribute injection, exception recording,
 * and high-resolution timing using nanosecond monotonic clock.
 */

import type {
  OTelSpan,
  SpanKind,
  SpanStatus,
  SpanEvent,
  SpanLink,
  W3CTraceContext,
} from '../types/otel-tracing.ts';
import { globalTraceContextHandler } from './w3c-trace-context.ts';

export class ActiveSpan {
  private readonly span: OTelSpan;
  private isEnded: boolean = false;

  constructor(
    traceId: string,
    spanId: string,
    name: string,
    kind: SpanKind = 'INTERNAL',
    parentSpanId?: string,
    attributes: Record<string, string | number | boolean> = {},
    links?: SpanLink[]
  ) {
    const nowNano = process.hrtime.bigint();
    this.span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind,
      startTimeNano: nowNano,
      attributes: { ...attributes },
      events: [],
      status: { code: 'UNSET' },
      links,
    };
  }

  public getSpanId(): string {
    return this.span.spanId;
  }

  public getTraceId(): string {
    return this.span.traceId;
  }

  public setAttribute(key: string, value: string | number | boolean): this {
    if (!this.isEnded) {
      this.span.attributes[key] = value;
    }
    return this;
  }

  public setAttributes(attrs: Record<string, string | number | boolean>): this {
    if (!this.isEnded) {
      Object.assign(this.span.attributes, attrs);
    }
    return this;
  }

  public addEvent(name: string, attributes?: Record<string, string | number | boolean>): this {
    if (!this.isEnded) {
      this.span.events.push({
        name,
        timestampNano: process.hrtime.bigint(),
        attributes,
      });
    }
    return this;
  }

  public setStatus(status: SpanStatus): this {
    if (!this.isEnded) {
      this.span.status = status;
    }
    return this;
  }

  public recordException(error: Error | string): this {
    if (this.isEnded) return this;

    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;
    const errorType = typeof error === 'string' ? 'Error' : error.name || 'Error';

    this.addEvent('exception', {
      'exception.type': errorType,
      'exception.message': message,
      'exception.stacktrace': stack || '',
    });

    this.setStatus({
      code: 'ERROR',
      description: message,
    });

    return this;
  }

  public end(): OTelSpan {
    if (this.isEnded) {
      return this.span;
    }

    const endNano = process.hrtime.bigint();
    this.span.endTimeNano = endNano;

    // Convert nanoseconds delta to milliseconds
    const deltaNano = Number(endNano - BigInt(this.span.startTimeNano));
    this.span.durationMs = Math.max(0.01, +(deltaNano / 1_000_000).toFixed(2));

    if (this.span.status.code === 'UNSET') {
      this.span.status.code = 'OK';
    }

    this.isEnded = true;
    return this.span;
  }

  public getRawSpan(): OTelSpan {
    return this.span;
  }
}

export class SpanTracer {
  private completedSpans: OTelSpan[] = [];

  /**
   * Starts a new span under a given or generated trace context.
   */
  public startSpan(
    name: string,
    options: {
      traceContext?: W3CTraceContext;
      parentSpanId?: string;
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      links?: SpanLink[];
    } = {}
  ): ActiveSpan {
    const traceId = options.traceContext?.traceId || globalTraceContextHandler.generateTraceId();
    const spanId = globalTraceContextHandler.generateSpanId();
    const parentSpanId = options.parentSpanId || options.traceContext?.spanId;

    return new ActiveSpan(
      traceId,
      spanId,
      name,
      options.kind || 'INTERNAL',
      parentSpanId,
      options.attributes,
      options.links
    );
  }

  /**
   * Wraps asynchronous or synchronous code inside a traced span.
   */
  public async traceExecution<T>(
    name: string,
    operation: (span: ActiveSpan) => Promise<T> | T,
    options: {
      traceContext?: W3CTraceContext;
      parentSpanId?: string;
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    } = {}
  ): Promise<{ result: T; span: OTelSpan }> {
    const span = this.startSpan(name, options);
    try {
      const result = await operation(span);
      const finishedSpan = span.end();
      this.completedSpans.push(finishedSpan);
      return { result, span: finishedSpan };
    } catch (err: any) {
      span.recordException(err);
      const finishedSpan = span.end();
      this.completedSpans.push(finishedSpan);
      throw err;
    }
  }

  public getCompletedSpans(): OTelSpan[] {
    return [...this.completedSpans];
  }

  public clear(): void {
    this.completedSpans = [];
  }
}

export const globalSpanTracer = new SpanTracer();
