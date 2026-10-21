/**
 * In-Memory Span Buffer & Adaptive Sampling Router (Contribution 204)
 *
 * Implements capacity-bounded ring buffer for completed spans with
 * head-based probabilistic sampling and tail-based adaptive error/latency retention.
 */

import type { OTelSpan } from '../types/otel-tracing.ts';

export interface SamplingStrategyConfig {
  headSampleRate: number; // 0.0 to 1.0 (default 1.0 for testing, 0.2 for high-throughput)
  tailSampleErrors: boolean; // Always keep traces with status === 'ERROR'
  latencyThresholdMs: number; // Retain traces if any span exceeds this duration (e.g. 3000ms)
  maxCapacity: number; // Ring buffer max size
}

export class SpanBuffer {
  private buffer: OTelSpan[] = [];
  private traceIndex: Map<string, OTelSpan[]> = new Map();
  private readonly config: SamplingStrategyConfig;

  constructor(config: Partial<SamplingStrategyConfig> = {}) {
    this.config = {
      headSampleRate: config.headSampleRate ?? 1.0,
      tailSampleErrors: config.tailSampleErrors ?? true,
      latencyThresholdMs: config.latencyThresholdMs ?? 3000,
      maxCapacity: config.maxCapacity ?? 5000,
    };
  }

  /**
   * Adds a completed span to the buffer, maintaining ring-buffer capacity.
   */
  public recordSpan(span: OTelSpan): void {
    if (this.buffer.length >= this.config.maxCapacity) {
      // Evict oldest span
      const evicted = this.buffer.shift();
      if (evicted) {
        const traceSpans = this.traceIndex.get(evicted.traceId);
        if (traceSpans) {
          const idx = traceSpans.indexOf(evicted);
          if (idx !== -1) traceSpans.splice(idx, 1);
          if (traceSpans.length === 0) {
            this.traceIndex.delete(evicted.traceId);
          }
        }
      }
    }

    this.buffer.push(span);
    const existing = this.traceIndex.get(span.traceId) || [];
    existing.push(span);
    this.traceIndex.set(span.traceId, existing);
  }

  /**
   * Evaluates if a trace should be retained and exported based on tail sampling.
   */
  public shouldSample(traceId: string): boolean {
    const spans = this.traceIndex.get(traceId) || [];
    if (spans.length === 0) return false;

    // 1. Tail sampling: error check
    if (this.config.tailSampleErrors) {
      const hasError = spans.some((s) => s.status.code === 'ERROR');
      if (hasError) return true;
    }

    // 2. Tail sampling: latency threshold
    const hasSlowSpan = spans.some((s) => (s.durationMs || 0) >= this.config.latencyThresholdMs);
    if (hasSlowSpan) return true;

    // 3. Head sampling: probabilistic ratio check based on deterministic traceId hash
    if (this.config.headSampleRate >= 1.0) return true;
    if (this.config.headSampleRate <= 0.0) return false;

    const hashSlice = parseInt(traceId.substring(0, 8), 16);
    const normalized = (hashSlice % 10000) / 10000;
    return normalized < this.config.headSampleRate;
  }

  /**
   * Retrieves all spans belonging to a traceId.
   */
  public getSpansForTrace(traceId: string): OTelSpan[] {
    return [...(this.traceIndex.get(traceId) || [])];
  }

  /**
   * Flushes and returns all buffered spans, clearing the buffer.
   */
  public flush(): OTelSpan[] {
    const all = [...this.buffer];
    this.buffer = [];
    this.traceIndex.clear();
    return all;
  }

  /**
   * Returns current buffer count.
   */
  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
    this.traceIndex.clear();
  }
}

export const globalSpanBuffer = new SpanBuffer();
