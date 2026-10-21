/**
 * W3C Trace Context Encoder & Decoder (Contribution 202)
 *
 * Implements the W3C Trace Context Level 1 specification for distributed tracing propagation:
 * - traceparent: version-trace_id-parent_id-trace_flags (e.g. 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01)
 * - tracestate: comma-delimited vendor list (e.g. proofix=hop:api,jaeger=sampled)
 */

import crypto from 'crypto';
import type { W3CTraceContext } from '../types/otel-tracing.ts';

const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ALL_ZEROS_32 = '00000000000000000000000000000000';
const ALL_ZEROS_16 = '0000000000000000';

export class W3CTraceContextHandler {
  /**
   * Generates a 16-byte cryptographically random Trace ID (32 hex characters).
   */
  public generateTraceId(): string {
    let id: string;
    do {
      id = crypto.randomBytes(16).toString('hex');
    } while (id === ALL_ZEROS_32);
    return id;
  }

  /**
   * Generates an 8-byte cryptographically random Span ID (16 hex characters).
   */
  public generateSpanId(): string {
    let id: string;
    do {
      id = crypto.randomBytes(8).toString('hex');
    } while (id === ALL_ZEROS_16);
    return id;
  }

  /**
   * Parses and validates an inbound W3C traceparent header.
   */
  public parseTraceParent(header?: string | null): W3CTraceContext | null {
    if (!header || typeof header !== 'string') {
      return null;
    }

    const trimmed = header.trim().toLowerCase();
    const match = trimmed.match(TRACEPARENT_REGEX);
    if (!match) {
      return null;
    }

    const [, version, traceId, spanId, traceFlags] = match;

    // Reject invalid spec cases
    if (version === 'ff' || traceId === ALL_ZEROS_32 || spanId === ALL_ZEROS_16) {
      return null;
    }

    return {
      version,
      traceId,
      spanId,
      traceFlags,
    };
  }

  /**
   * Formats a W3CTraceContext into the standard traceparent header string.
   */
  public formatTraceParent(context: {
    traceId: string;
    spanId: string;
    sampled?: boolean;
    version?: string;
  }): string {
    const version = context.version || '00';
    const traceId = context.traceId.toLowerCase().padStart(32, '0');
    const spanId = context.spanId.toLowerCase().padStart(16, '0');
    const flags = context.sampled !== false ? '01' : '00';

    return `${version}-${traceId}-${spanId}-${flags}`;
  }

  /**
   * Parses a tracestate header into key-value pairs.
   */
  public parseTraceState(header?: string | null): Record<string, string> {
    const result: Record<string, string> = {};
    if (!header || typeof header !== 'string') {
      return result;
    }

    const members = header.split(',');
    for (const member of members) {
      const parts = member.trim().split('=');
      if (parts.length === 2 && parts[0] && parts[1]) {
        result[parts[0].trim()] = parts[1].trim();
      }
    }
    return result;
  }

  /**
   * Formats key-value pairs into a W3C tracestate header.
   */
  public formatTraceState(state: Record<string, string>): string {
    return Object.entries(state)
      .filter(([k, v]) => Boolean(k && v))
      .map(([k, v]) => `${k.trim()}=${v.trim()}`)
      .join(',');
  }

  /**
   * Creates a fresh root trace context.
   */
  public createRootContext(sampled: boolean = true): W3CTraceContext {
    return {
      version: '00',
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      traceFlags: sampled ? '01' : '00',
    };
  }

  /**
   * Creates a child trace context keeping the same traceId and creating a new spanId.
   */
  public createChildContext(parent: W3CTraceContext): W3CTraceContext {
    return {
      version: parent.version,
      traceId: parent.traceId,
      spanId: this.generateSpanId(),
      traceFlags: parent.traceFlags,
      traceState: parent.traceState,
    };
  }
}

export const globalTraceContextHandler = new W3CTraceContextHandler();
