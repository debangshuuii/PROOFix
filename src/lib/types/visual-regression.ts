export type BrowserEngine = 'chromium' | 'firefox' | 'webkit' | 'msedge' | 'chrome';

export interface ViewportDimension {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface ScreenshotTestContext {
  testResultId?: string;
  testName: string;
  stepName?: string;
  category?: string;
  selector?: string;
  tags?: string[];
  environment?: Record<string, string>;
}

export interface ScreenshotMetadata {
  id: string;
  runId: string;
  projectId: string;
  route: string;
  viewport: ViewportDimension;
  browser: BrowserEngine | string;
  browserVersion?: string;
  timestamp: string;
  testContext: ScreenshotTestContext;
  filePath: string;
  fileSizeBytes?: number;
  format: 'png' | 'jpeg' | 'webp';
  contentHash?: string;
}

export interface ScreenshotQueryFilter {
  projectId?: string;
  runId?: string;
  route?: string;
  browser?: string;
  viewport?: { width: number; height: number };
  testName?: string;
  category?: string;
  tag?: string;
  since?: string;
  until?: string;
}

export type PairMatchStatus =
  | 'matched'
  | 'unmatched_missing_target'
  | 'unmatched_missing_baseline'
  | 'incompatible_viewport'
  | 'incompatible_browser'
  | 'incompatible_route';

export interface ScreenshotPair {
  id: string;
  route: string;
  baseline: ScreenshotMetadata | null;
  target: ScreenshotMetadata | null;
  status: PairMatchStatus;
  compatibilityDetails: {
    routeMatch: boolean;
    browserMatch: boolean;
    viewportMatch: boolean;
    contextMatch: boolean;
    notes?: string;
  };
}

export interface MaskRegion {
  id: string;
  name: string;
  route?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px' | 'percent';
  comment?: string;
  createdAt?: string;
}

export interface ComparisonThresholdOptions {
  threshold?: number; // 0.0 to 1.0 (default: 0.1)
  includeAA?: boolean; // include anti-aliasing
  alpha?: number; // opacity of diff pixels
  diffColorHex?: string; // e.g. '#ff0033'
  maskedRegions?: MaskRegion[];
}

export type VisualChangeClassification =
  | 'visual_match'
  | 'minor_visual_difference'
  | 'significant_visual_difference'
  | 'incompatible_comparison';

export interface VisualDiffStatistics {
  totalPixels: number;
  changedPixels: number;
  differencePercentage: number; // e.g. 1.25 for 1.25%
  threshold: number;
  maskedPixelsExcluded: number;
  classification: VisualChangeClassification;
  label: string;
  disclaimer: string;
}

export interface VisualDiffResult {
  pairId: string;
  diffImagePath: string; // URL / file path of diff output PNG
  stats: VisualDiffStatistics;
  baselineScreenshot: ScreenshotMetadata;
  targetScreenshot: ScreenshotMetadata;
  computedAt: string;
}

export interface BaselineRecord {
  id: string;
  projectId: string;
  runId: string;
  runNumber: number;
  commitHash: string;
  branch: string;
  setAt: string;
  setBy: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'superseded';
  approvalComment?: string;
  approvedBy?: string;
  approvedAt?: string;
  auditSignature?: string;
}
