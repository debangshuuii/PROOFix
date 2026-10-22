/**
 * Unified Quality Auditing Agent Types: Accessibility & Core Web Vitals
 * Models WCAG compliance violations, Core Web Vitals thresholds,
 * resource budgets, and composite health scores.
 */

export interface AccessibilityAuditReport {
  score: number; // 0 - 100
  wcagLevel: 'A' | 'AA' | 'AAA';
  violationsCount: number;
  missingAltCount: number;
  missingFormLabelsCount: number;
  contrastFailuresCount: number;
  tabIndexViolationsCount: number;
  violations: Array<{
    ruleId: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    selector: string;
    helpUrl?: string;
  }>;
}

export interface CoreWebVitalsMetrics {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  clsScore: number;
  inpMs?: number;
  totalJsBytes: number;
  totalCssBytes: number;
  totalImageBytes: number;
  totalTransferBytes: number;
  domElementsCount: number;
  performanceScore: number; // 0 - 100
}

export interface QualityBudgetThresholds {
  maxLcpMs: number;
  maxClsScore: number;
  maxTtfbMs: number;
  maxJsBundleBytes: number;
  minAccessibilityScore: number;
}

export interface QualityAuditResult {
  accessibility: AccessibilityAuditReport;
  performance: CoreWebVitalsMetrics;
  budgetPassed: boolean;
  budgetViolations: string[];
}
