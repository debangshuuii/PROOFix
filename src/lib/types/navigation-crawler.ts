/**
 * Dynamic Route Navigation & Crawler Agent Types
 * Governs multi-depth page spidering, anchor extraction, dynamic slug resolution,
 * and dead-link detection schemas.
 */

export interface NavigationCrawlerConfig {
  maxDepth: number;
  maxRoutes: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  normalizeTrailingSlash: boolean;
  timeoutPerRouteMs: number;
  captureScreenshots: boolean;
  detectRedirectLoops: boolean;
  recordNavigationTiming: boolean;
}

export interface RouteNavigationCheck {
  route: string;
  sourceUrl: string;
  depth: number;
  httpStatus: number;
  statusText: string;
  durationMs: number;
  passed: boolean;
  title?: string;
  error?: string;
  screenshotPath?: string;
  discoveredAnchorsCount: number;
  isDeadLink: boolean;
}

export interface DeadLinkFinding {
  targetUrl: string;
  discoveredOnUrl: string;
  anchorText?: string;
  anchorHtml?: string;
  httpStatus: number;
  errorMessage?: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface DynamicSlugRule {
  pattern: RegExp;
  placeholder: string;
  syntheticValue: string;
  rationale: string;
}

export interface NavigationTimingMetrics {
  domContentLoadedMs: number;
  loadEventMs: number;
  firstPaintMs?: number;
  routeTransitionDurationMs: number;
}

export interface RouteCrawlerSummary {
  totalRoutesDiscovered: number;
  totalRoutesChecked: number;
  passedCount: number;
  failedCount: number;
  deadLinks: DeadLinkFinding[];
  durationMs: number;
  checks: RouteNavigationCheck[];
}
