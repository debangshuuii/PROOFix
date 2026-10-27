import { BrokenRouteDetail, ActionTestItem } from './action-types';

/**
 * Scans test execution results for HTTP 404 dead link and broken route occurrences.
 */
export function detectBrokenRoutes(
  results: ActionTestItem[],
  executionLogs: string[] = []
): BrokenRouteDetail[] {
  const brokenRoutes: BrokenRouteDetail[] = [];
  const seenRoutes = new Set<string>();

  for (const res of results) {
    const resAny = res as any;
    const errorMsg = resAny.error || resAny.errorDetails?.message || '';
    const rawLogs = resAny.consoleLogs || resAny.evidence?.consoleErrors?.map((c: any) => c.text || c.message) || [];
    const logs = rawLogs.map((l: any) => (typeof l === 'string' ? l : JSON.stringify(l)));
    const allText = [errorMsg, ...logs].join('\n');

    // Check for HTTP 404 indicators
    const is404 =
      /404(?:\s+Not\s+Found)?/i.test(allText) ||
      /status code 404/i.test(allText) ||
      (resAny.category === 'route_discovery' && resAny.status === 'failed');

    if (is404) {
      const targetRoute = resAny.route || resAny.errorDetails?.url || extractRouteFromText(allText) || `test:${resAny.testId || resAny.id || 'unknown'}`;

      if (!seenRoutes.has(targetRoute)) {
        seenRoutes.add(targetRoute);
        brokenRoutes.push({
          route: targetRoute,
          httpStatus: 404,
          referringPage: extractReferringPage(allText),
          durationMs: resAny.durationMs,
        });
      }
    }
  }

  // Scan execution logs for standalone 404 occurrences
  for (const log of executionLogs) {
    if (/(?:HTTP\/[0-9.]+\s+404|status[:\s]+404|404\s+Not\s+Found)/i.test(log)) {
      const route = extractRouteFromText(log);
      if (route && !seenRoutes.has(route)) {
        seenRoutes.add(route);
        brokenRoutes.push({
          route,
          httpStatus: 404,
          referringPage: extractReferringPage(log),
        });
      }
    }
  }

  return brokenRoutes;
}

function extractRouteFromText(text: string): string | undefined {
  const m = text.match(/(?:GET|POST|HEAD|navigating to)\s+([/\w\-.]+)/i) ||
            text.match(/route\s+["']([/\w\-.]+)["']/i);
  return m ? m[1] : undefined;
}

function extractReferringPage(text: string): string | undefined {
  const m = text.match(/(?:from|referer|referrer|parent):\s*([/\w\-.]+)/i);
  return m ? m[1] : undefined;
}
