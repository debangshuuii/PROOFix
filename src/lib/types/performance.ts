/**
 * PROOFix Performance Auditing Types
 * Core Web Vitals, Navigation Timings, Resource Budgets, and Regression Detection.
 */

export type VitalRating = 'good' | 'needs-improvement' | 'poor' | 'unknown';

export interface VitalThresholds {
  good: number;
  poor: number;
}

export interface VitalMetric {
  name: string;
  label: string;
  value: number | null;
  unit: 'ms' | 'score';
  rating: VitalRating;
  thresholds: VitalThresholds;
  description: string;
}

export interface CoreWebVitals {
  lcp: VitalMetric; // Largest Contentful Paint
  cls: VitalMetric; // Cumulative Layout Shift
  fcp: VitalMetric; // First Contentful Paint
  ttfb: VitalMetric; // Time to First Byte
  inp?: VitalMetric; // Interaction to Next Paint
  fid?: VitalMetric; // First Input Delay
}

export interface PageNavigationTimings {
  dnsLookupMs: number;
  tcpConnectionMs: number;
  tlsHandshakeMs: number;
  ttfbMs: number;
  contentDownloadMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
  totalDurationMs: number;
}

export interface ResourceCategoryBreakdown {
  category: 'document' | 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'other';
  count: number;
  transferSizeBytes: number;
  decodedSizeBytes: number;
}

export interface ResourceBudgetConfig {
  maxTotalSizeBytes?: number;       // e.g. 2 * 1024 * 1024 (2MB)
  maxJsSizeBytes?: number;          // e.g. 500 * 1024 (500KB)
  maxCssSizeBytes?: number;         // e.g. 150 * 1024 (150KB)
  maxImageSizeBytes?: number;       // e.g. 1024 * 1024 (1MB)
  maxTotalRequests?: number;        // e.g. 50
  maxDomNodes?: number;             // e.g. 1500
  maxDomDepth?: number;             // e.g. 32
}

export interface ResourceBudgetViolation {
  metric: string;
  budgetLimit: number;
  actualValue: number;
  unit: 'bytes' | 'count';
  severity: 'warning' | 'error';
  message: string;
}

export interface PerformanceBudgetReport {
  passed: boolean;
  violations: ResourceBudgetViolation[];
  totalSizeBytes: number;
  totalRequests: number;
  domNodeCount: number;
  maxDomDepth: number;
  categories: ResourceCategoryBreakdown[];
}

export type NetworkThrottlingPreset =
  | 'none'
  | 'fast-3g'
  | 'slow-3g'
  | 'offline'
  | 'custom';

export interface ThrottlingProfile {
  name: NetworkThrottlingPreset;
  offline: boolean;
  downloadThroughput: number; // bytes/sec
  uploadThroughput: number;   // bytes/sec
  latencyMs: number;
  cpuThrottlingRate: number;  // 1 = no throttle, 4 = 4x slowdown
}

export interface PerformanceAuditSummary {
  url: string;
  measuredAt: string;
  throttling: NetworkThrottlingPreset;
  overallScore: number; // 0 - 100
  rating: VitalRating;
  vitals: CoreWebVitals;
  timings: PageNavigationTimings;
  budgetReport?: PerformanceBudgetReport;
}

export interface MetricDelta {
  metricName: string;
  baselineValue: number | null;
  currentValue: number | null;
  delta: number;
  percentageDelta: number;
  isRegression: boolean;
  unit: string;
}

export interface PerformanceRegressionReport {
  baselineRunId: string;
  targetRunId: string;
  hasRegression: boolean;
  overallScoreDelta: number;
  deltas: MetricDelta[];
  regressionsCount: number;
  improvementsCount: number;
  gatePassed: boolean;
  recommendations: string[];
}
