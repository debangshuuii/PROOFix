import { HydrationDriftDetail } from './action-types';
import { TestExecutionResult } from '../lib/types';

/**
 * Known React 19 and Next.js SSR hydration error signatures.
 */
const HYDRATION_SIGNATURES = [
  /Hydration failed because the (?:server-rendered|initial) UI does not match/i,
  /react(?:js)?\.org\/docs\/error-decoder\.html\?invariant=418/i,
  /react\.dev\/errors\/418/i,
  /Text content does not match server-rendered HTML/i,
  /Expected server HTML to contain a matching <([^>]+)>/i,
  /An error occurred during hydration\. The server HTML was replaced/i,
  /Hydration mismatch/i,
];

/**
 * Scans test execution logs and failure messages for React 19 SSR hydration drift.
 */
export function detectHydrationDrifts(
  results: TestExecutionResult[],
  executionLogs: string[] = []
): HydrationDriftDetail[] {
  const drifts: HydrationDriftDetail[] = [];
  const seenKeys = new Set<string>();

  // 1. Scan individual test execution results
  for (const res of results) {
    const messages = [
      res.error || '',
      ...(res.consoleLogs || []).map((l) => (typeof l === 'string' ? l : JSON.stringify(l))),
    ];

    for (const msg of messages) {
      if (!msg) continue;

      for (const sig of HYDRATION_SIGNATURES) {
        if (sig.test(msg)) {
          const testKey = `${res.route || res.testId}`;
          if (!seenKeys.has(testKey)) {
            seenKeys.add(testKey);

            // Attempt extracting server and client drift mismatch snippets
            let serverValue: string | undefined;
            let clientValue: string | undefined;

            const serverMatch = msg.match(/Server:\s*["']?([^"'\n\r]+)["']?/i);
            const clientMatch = msg.match(/Client:\s*["']?([^"'\n\r]+)["']?/i);
            if (serverMatch) serverValue = serverMatch[1].trim();
            if (clientMatch) clientValue = clientMatch[1].trim();

            drifts.push({
              route: res.route || `test:${res.testId}`,
              component: extractComponentName(msg),
              errorMessage: sanitizeHydrationError(msg),
              serverValue,
              clientValue,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }
      }
    }
  }

  // 2. Scan aggregated execution logs
  for (const log of executionLogs) {
    for (const sig of HYDRATION_SIGNATURES) {
      if (sig.test(log)) {
        const key = `log:${log.slice(0, 80)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          drifts.push({
            route: extractRouteFromLog(log) || 'Global / SSR Pipeline',
            component: extractComponentName(log),
            errorMessage: sanitizeHydrationError(log),
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }
    }
  }

  return drifts;
}

function extractComponentName(msg: string): string | undefined {
  const compMatch =
    msg.match(/(?:in|at)\s+<([A-Z][A-Za-z0-9_]+)>/) ||
    msg.match(/at\s+([A-Z][A-Za-z0-9_]+)\s+\(/);
  return compMatch ? compMatch[1] : undefined;
}

function extractRouteFromLog(log: string): string | undefined {
  const routeMatch = log.match(/(?:GET|POST|HEAD)\s+([/\w\-.]+)/i) || log.match(/route:\s*([/\w\-.]+)/i);
  return routeMatch ? routeMatch[1] : undefined;
}

function sanitizeHydrationError(msg: string): string {
  const firstLine = msg.split(/[\r\n]+/)[0].trim();
  return firstLine.length > 250 ? `${firstLine.substring(0, 247)}...` : firstLine;
}
