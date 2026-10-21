/**
 * Playwright Browser Context & Network Request W3C Header Injector (Contribution 207)
 *
 * Injects W3C traceparent and tracestate headers into Playwright browser context,
 * propagates distributed trace context to web servers, and maps DOM performance metrics
 * into OpenTelemetry span events.
 */

import type { W3CTraceContext } from '../types/otel-tracing.ts';
import { globalTraceContextHandler } from './w3c-trace-context.ts';
import type { ActiveSpan } from './span-tracer.ts';

export interface BrowserPerformanceTiming {
  navigationStart?: number;
  domContentLoadedMs?: number;
  loadEventEndMs?: number;
  firstContentfulPaintMs?: number;
  largestContentfulPaintMs?: number;
  cumulativeLayoutShift?: number;
}

export class PlaywrightTraceInjector {
  /**
   * Injects traceparent and tracestate into outbound HTTP headers.
   */
  public injectTraceContextIntoHeaders(
    existingHeaders: Record<string, string> = {},
    traceContext: W3CTraceContext
  ): Record<string, string> {
    const traceparent = globalTraceContextHandler.formatTraceParent(traceContext);
    const headers: Record<string, string> = {
      ...existingHeaders,
      traceparent,
    };

    if (traceContext.traceState) {
      headers['tracestate'] = traceContext.traceState;
    }

    return headers;
  }

  /**
   * Generates Playwright extraHTTPHeaders for new browser contexts.
   */
  public createBrowserContextOptions(
    traceContext: W3CTraceContext,
    customHeaders: Record<string, string> = {}
  ): { extraHTTPHeaders: Record<string, string> } {
    return {
      extraHTTPHeaders: this.injectTraceContextIntoHeaders(customHeaders, traceContext),
    };
  }

  /**
   * Converts DOM Performance and Web Vitals into OpenTelemetry span events.
   */
  public recordBrowserPerformanceTiming(
    span: ActiveSpan,
    timing: BrowserPerformanceTiming
  ): void {
    if (timing.domContentLoadedMs !== undefined) {
      span.addEvent('dom_content_loaded', {
        'performance.dom_content_loaded_ms': timing.domContentLoadedMs,
      });
    }

    if (timing.loadEventEndMs !== undefined) {
      span.addEvent('load_event_end', {
        'performance.load_event_end_ms': timing.loadEventEndMs,
      });
    }

    if (timing.largestContentfulPaintMs !== undefined) {
      span.addEvent('largest_contentful_paint', {
        'web_vitals.lcp_ms': timing.largestContentfulPaintMs,
      });
      span.setAttribute('web_vitals.lcp_ms', timing.largestContentfulPaintMs);
    }

    if (timing.cumulativeLayoutShift !== undefined) {
      span.addEvent('cumulative_layout_shift', {
        'web_vitals.cls': timing.cumulativeLayoutShift,
      });
      span.setAttribute('web_vitals.cls', timing.cumulativeLayoutShift);
    }
  }

  /**
   * Records uncaught browser console exceptions as OTel span events.
   */
  public recordConsoleViolation(
    span: ActiveSpan,
    errorText: string,
    level: 'error' | 'warning' = 'error'
  ): void {
    span.addEvent('browser_console_violation', {
      'console.level': level,
      'console.message': errorText,
    });

    if (level === 'error') {
      span.setAttribute('browser.has_console_errors', true);
    }
  }
}

export const globalPlaywrightTraceInjector = new PlaywrightTraceInjector();
