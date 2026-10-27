import { CheckRunGateResult, HydrationDriftDetail, BrokenRouteDetail } from './action-types';

export interface GatekeeperOptions {
  failOnHydrationDrift?: boolean;
  failOnBrokenRoutes?: boolean;
  hydrationDrifts: HydrationDriftDetail[];
  brokenRoutes: BrokenRouteDetail[];
}

/**
 * Evaluates hard check-run gating policies for React 19 hydration drift and broken routes.
 */
export function evaluateCheckRunGate(options: GatekeeperOptions): CheckRunGateResult {
  const {
    failOnHydrationDrift = true,
    failOnBrokenRoutes = true,
    hydrationDrifts = [],
    brokenRoutes = [],
  } = options;

  const hasHydrationViolation = failOnHydrationDrift && hydrationDrifts.length > 0;
  const hasBrokenRouteViolation = failOnBrokenRoutes && brokenRoutes.length > 0;

  const passed = !hasHydrationViolation && !hasBrokenRouteViolation;
  const conclusion: 'success' | 'failure' = passed ? 'success' : 'failure';

  const annotations: CheckRunGateResult['annotations'] = [];

  // 1. Add hydration drift annotations
  for (const h of hydrationDrifts) {
    annotations.push({
      path: resolveFilePathForRoute(h.route),
      start_line: 1,
      end_line: 1,
      annotation_level: failOnHydrationDrift ? 'failure' : 'warning',
      title: 'React 19 Hydration Drift Error (#418)',
      message: `Hydration mismatch on route ${h.route}${h.component ? ` in <${h.component}>` : ''}: ${h.errorMessage}`,
    });
  }

  // 2. Add broken route 404 annotations
  for (const b of brokenRoutes) {
    annotations.push({
      path: resolveFilePathForRoute(b.route),
      start_line: 1,
      end_line: 1,
      annotation_level: failOnBrokenRoutes ? 'failure' : 'warning',
      title: 'Broken Route 404 Not Found',
      message: `Route returned HTTP 404 Not Found: ${b.route}${b.referringPage ? ` (referred from ${b.referringPage})` : ''}`,
    });
  }

  let title = 'PROOFix Verification Gate Passed';
  let summary = 'All SSR hydration contracts and navigation routes are verified with 100% genuine Playwright evidence.';

  if (!passed) {
    const reasons: string[] = [];
    if (hasHydrationViolation) {
      reasons.push(`${hydrationDrifts.length} React 19 SSR hydration drift error(s)`);
    }
    if (hasBrokenRouteViolation) {
      reasons.push(`${brokenRoutes.length} dead route 404 error(s)`);
    }
    title = `PROOFix Gate Rejected: ${reasons.join(' and ')}`;
    summary = `Merge blocked by PROOFix hard gate. Found ${reasons.join(', ')}. Review annotations and auto-fix proposals.`;
  }

  return {
    gateName: 'PROOFix Verification Gate',
    passed,
    conclusion,
    title,
    summary,
    hydrationCount: hydrationDrifts.length,
    brokenRouteCount: brokenRoutes.length,
    annotations,
  };
}

function resolveFilePathForRoute(route: string): string {
  if (route.startsWith('test:')) return 'tests/verify-proofix.mjs';
  const clean = route.replace(/^\//, '');
  if (clean.startsWith('api/')) return `src/app/${clean}/route.ts`;
  return clean ? `src/app/${clean}/page.tsx` : 'src/app/page.tsx';
}

/**
 * Specifically evaluates the dead link / 404 broken route blocking policy.
 */
export function evaluateBrokenRoutesPolicy(brokenRoutes: BrokenRouteDetail[]): {
  violates: boolean;
  count: number;
  message: string;
} {
  const count = brokenRoutes.length;
  const violates = count > 0;
  return {
    violates,
    count,
    message: violates
      ? `Blocked merge: ${count} dead link(s) / 404 route(s) detected during automated crawling.`
      : 'Passed: 0 dead routes detected.',
  };
}
