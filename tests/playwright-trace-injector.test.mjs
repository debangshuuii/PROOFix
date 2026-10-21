import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PlaywrightTraceInjector,
  globalPlaywrightTraceInjector,
} from '../src/lib/telemetry/playwright-trace-injector.ts';
import { ActiveSpan } from '../src/lib/telemetry/span-tracer.ts';

test('injectTraceContextIntoHeaders adds traceparent and tracestate', () => {
  const injector = new PlaywrightTraceInjector();
  const context = {
    version: '00',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    traceFlags: '01',
    traceState: 'congo=uc123',
  };

  const headers = injector.injectTraceContextIntoHeaders(
    { 'authorization': 'Bearer token-123' },
    context
  );

  assert.equal(headers['authorization'], 'Bearer token-123');
  assert.equal(headers['traceparent'], '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  assert.equal(headers['tracestate'], 'congo=uc123');
});

test('createBrowserContextOptions configures extraHTTPHeaders for Playwright', () => {
  const options = globalPlaywrightTraceInjector.createBrowserContextOptions({
    version: '00',
    traceId: 'abcdef0123456789abcdef0123456789',
    spanId: '1234567890abcdef',
    traceFlags: '01',
  });

  assert.ok(options.extraHTTPHeaders);
  assert.equal(
    options.extraHTTPHeaders['traceparent'],
    '00-abcdef0123456789abcdef0123456789-1234567890abcdef-01'
  );
});

test('recordBrowserPerformanceTiming logs web vitals into active span events', () => {
  const span = new ActiveSpan(
    '4bf92f3577b34da6a3ce929d0e0e4736',
    '00f067aa0ba902b7',
    'playwright_browser_session'
  );

  globalPlaywrightTraceInjector.recordBrowserPerformanceTiming(span, {
    domContentLoadedMs: 420,
    largestContentfulPaintMs: 1250,
    cumulativeLayoutShift: 0.04,
  });

  const raw = span.getRawSpan();
  assert.equal(raw.events.length, 3);
  assert.equal(raw.attributes['web_vitals.lcp_ms'], 1250);
  assert.equal(raw.attributes['web_vitals.cls'], 0.04);
});

test('recordConsoleViolation captures browser console errors', () => {
  const span = new ActiveSpan(
    '4bf92f3577b34da6a3ce929d0e0e4736',
    '00f067aa0ba902b7',
    'playwright_browser_session'
  );

  globalPlaywrightTraceInjector.recordConsoleViolation(
    span,
    'Uncaught TypeError: Cannot read properties of undefined (reading "map")'
  );

  const raw = span.getRawSpan();
  assert.equal(raw.attributes['browser.has_console_errors'], true);
  assert.equal(raw.events.length, 1);
  assert.equal(raw.events[0].name, 'browser_console_violation');
});
