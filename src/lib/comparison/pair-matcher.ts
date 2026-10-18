import {
  ScreenshotMetadata,
  ScreenshotPair,
  PairMatchStatus,
} from '../types/visual-regression';

export interface PairMatchingSummary {
  totalPairs: number;
  matchedCount: number;
  incompatibleCount: number;
  missingTargetCount: number;
  missingBaselineCount: number;
}

export interface PairMatchingResult {
  allPairs: ScreenshotPair[];
  matchedPairs: ScreenshotPair[];
  incompatiblePairs: ScreenshotPair[];
  unmatchedBaseline: ScreenshotPair[];
  unmatchedTarget: ScreenshotPair[];
  summary: PairMatchingSummary;
}

/**
 * Computes pairwise compatibility diagnostics between a baseline and target screenshot.
 */
export function checkPairCompatibility(
  baseline: ScreenshotMetadata,
  target: ScreenshotMetadata
): {
  compatible: boolean;
  status: PairMatchStatus;
  details: ScreenshotPair['compatibilityDetails'];
} {
  const routeMatch = baseline.route === target.route;
  const browserMatch =
    baseline.browser.toLowerCase() === target.browser.toLowerCase();
  const viewportMatch =
    baseline.viewport.width === target.viewport.width &&
    baseline.viewport.height === target.viewport.height;

  const bTest = baseline.testContext?.testName?.toLowerCase() || '';
  const tTest = target.testContext?.testName?.toLowerCase() || '';
  const contextMatch =
    bTest === tTest ||
    bTest.includes(tTest) ||
    tTest.includes(bTest) ||
    baseline.testContext?.category === target.testContext?.category;

  if (!routeMatch) {
    return {
      compatible: false,
      status: 'incompatible_route',
      details: {
        routeMatch: false,
        browserMatch,
        viewportMatch,
        contextMatch,
        notes: `Route mismatch: baseline "${baseline.route}" vs target "${target.route}". Images from different routes cannot be visually compared.`,
      },
    };
  }

  if (!viewportMatch) {
    return {
      compatible: false,
      status: 'incompatible_viewport',
      details: {
        routeMatch: true,
        browserMatch,
        viewportMatch: false,
        contextMatch,
        notes: `Viewport mismatch: baseline ${baseline.viewport.width}x${baseline.viewport.height} vs target ${target.viewport.width}x${target.viewport.height}. Different viewports will distort pixel delta calculations.`,
      },
    };
  }

  if (!browserMatch) {
    return {
      compatible: false,
      status: 'incompatible_browser',
      details: {
        routeMatch: true,
        browserMatch: false,
        viewportMatch: true,
        contextMatch,
        notes: `Browser rendering mismatch: baseline "${baseline.browser}" vs target "${target.browser}". Different font rendering and anti-aliasing engines create false positive diffs.`,
      },
    };
  }

  return {
    compatible: true,
    status: 'matched',
    details: {
      routeMatch: true,
      browserMatch: true,
      viewportMatch: true,
      contextMatch,
      notes: 'Fully compatible: Matching route, viewport, browser, and test context.',
    },
  };
}

/**
 * Matches two sets of screenshot artifacts into compatible pairs and explicit unmatched statuses.
 */
export function matchScreenshotPairs(
  baselineScreenshots: ScreenshotMetadata[],
  targetScreenshots: ScreenshotMetadata[]
): PairMatchingResult {
  const matchedPairs: ScreenshotPair[] = [];
  const incompatiblePairs: ScreenshotPair[] = [];
  const unmatchedBaseline: ScreenshotPair[] = [];
  const unmatchedTarget: ScreenshotPair[] = [];

  const matchedTargetIds = new Set<string>();

  for (const baseline of baselineScreenshots) {
    // 1. First attempt exact match: same route, viewport, browser, and context
    let candidate = targetScreenshots.find(
      (t) =>
        !matchedTargetIds.has(t.id) &&
        t.route === baseline.route &&
        t.browser.toLowerCase() === baseline.browser.toLowerCase() &&
        t.viewport.width === baseline.viewport.width &&
        t.viewport.height === baseline.viewport.height &&
        (t.testContext?.testName === baseline.testContext?.testName ||
          t.testContext?.category === baseline.testContext?.category)
    );

    // 2. Second attempt: match by route + viewport + browser
    if (!candidate) {
      candidate = targetScreenshots.find(
        (t) =>
          !matchedTargetIds.has(t.id) &&
          t.route === baseline.route &&
          t.browser.toLowerCase() === baseline.browser.toLowerCase() &&
          t.viewport.width === baseline.viewport.width &&
          t.viewport.height === baseline.viewport.height
      );
    }

    if (candidate) {
      matchedTargetIds.add(candidate.id);
      const compatibility = checkPairCompatibility(baseline, candidate);
      matchedPairs.push({
        id: `pair_${baseline.id}_${candidate.id}`,
        route: baseline.route,
        baseline,
        target: candidate,
        status: 'matched',
        compatibilityDetails: compatibility.details,
      });
      continue;
    }

    // 3. Third attempt: Check if there is an incompatible candidate on the same route (e.g. wrong viewport or browser)
    const incompatibleCandidate = targetScreenshots.find(
      (t) => !matchedTargetIds.has(t.id) && t.route === baseline.route
    );

    if (incompatibleCandidate) {
      matchedTargetIds.add(incompatibleCandidate.id);
      const compatibility = checkPairCompatibility(baseline, incompatibleCandidate);
      incompatiblePairs.push({
        id: `pair_incompat_${baseline.id}_${incompatibleCandidate.id}`,
        route: baseline.route,
        baseline,
        target: incompatibleCandidate,
        status: compatibility.status,
        compatibilityDetails: compatibility.details,
      });
      continue;
    }

    // 4. Otherwise baseline has no corresponding candidate in target run
    unmatchedBaseline.push({
      id: `pair_orphan_b_${baseline.id}`,
      route: baseline.route,
      baseline,
      target: null,
      status: 'unmatched_missing_target',
      compatibilityDetails: {
        routeMatch: false,
        browserMatch: false,
        viewportMatch: false,
        contextMatch: false,
        notes: `Baseline screenshot for route "${baseline.route}" has no corresponding capture in the target run.`,
      },
    });
  }

  // Identify any target screenshots that were never matched with a baseline
  for (const target of targetScreenshots) {
    if (!matchedTargetIds.has(target.id)) {
      unmatchedTarget.push({
        id: `pair_orphan_t_${target.id}`,
        route: target.route,
        baseline: null,
        target,
        status: 'unmatched_missing_baseline',
        compatibilityDetails: {
          routeMatch: false,
          browserMatch: false,
          viewportMatch: false,
          contextMatch: false,
          notes: `Target run captured a new screenshot on route "${target.route}", but no corresponding baseline artifact exists.`,
        },
      });
    }
  }

  const allPairs = [
    ...matchedPairs,
    ...incompatiblePairs,
    ...unmatchedBaseline,
    ...unmatchedTarget,
  ];

  return {
    allPairs,
    matchedPairs,
    incompatiblePairs,
    unmatchedBaseline,
    unmatchedTarget,
    summary: {
      totalPairs: allPairs.length,
      matchedCount: matchedPairs.length,
      incompatibleCount: incompatiblePairs.length,
      missingTargetCount: unmatchedBaseline.length,
      missingBaselineCount: unmatchedTarget.length,
    },
  };
}
