import type {
  PerformanceAuditSummary,
  PerformanceRegressionReport,
  MetricDelta,
} from '../types/performance.ts';

export interface PerformanceGatePolicy {
  failOnPoorVital?: boolean;                // Fail if any Core Web Vital has 'poor' rating
  minOverallScore?: number;                 // e.g. 70
  maxLcpRegressionPercent?: number;         // e.g. 20 (fail if LCP regresses by > 20%)
  maxClsRegressionDelta?: number;           // e.g. 0.05
  maxTotalSizeRegressionPercent?: number;   // e.g. 15 (fail if total size increases by > 15%)
  maxJsSizeRegressionPercent?: number;      // e.g. 15
}

export const DEFAULT_PERFORMANCE_GATE: PerformanceGatePolicy = {
  failOnPoorVital: true,
  minOverallScore: 65,
  maxLcpRegressionPercent: 20,
  maxClsRegressionDelta: 0.05,
  maxTotalSizeRegressionPercent: 15,
  maxJsSizeRegressionPercent: 15,
};

/**
 * Calculates delta between baseline and current metric.
 * For performance metrics, higher is worse (unless it's an overall score).
 */
export function computeMetricDelta(
  metricName: string,
  baselineValue: number | null,
  currentValue: number | null,
  unit: string,
  tolerancePercent: number = 5
): MetricDelta {
  if (baselineValue === null || currentValue === null || isNaN(baselineValue) || isNaN(currentValue)) {
    return {
      metricName,
      baselineValue,
      currentValue,
      delta: 0,
      percentageDelta: 0,
      isRegression: false,
      unit,
    };
  }

  const delta = Math.round((currentValue - baselineValue) * 100) / 100;
  const percentageDelta = baselineValue > 0
    ? Math.round(((currentValue - baselineValue) / baselineValue) * 1000) / 10
    : 0;

  // For duration/size/score, an increase exceeding tolerance is a regression
  const isRegression = percentageDelta > tolerancePercent;

  return {
    metricName,
    baselineValue,
    currentValue,
    delta,
    percentageDelta,
    isRegression,
    unit,
  };
}

/**
 * Analyzes regression between baseline and target performance runs.
 */
export function detectPerformanceRegressions(
  baseline: PerformanceAuditSummary,
  current: PerformanceAuditSummary,
  baselineRunId: string = 'baseline_run',
  targetRunId: string = 'current_run'
): PerformanceRegressionReport {
  const deltas: MetricDelta[] = [];

  // 1. Core Web Vitals
  deltas.push(
    computeMetricDelta(
      'Largest Contentful Paint (LCP)',
      baseline.vitals.lcp.value,
      current.vitals.lcp.value,
      'ms',
      10
    )
  );

  deltas.push(
    computeMetricDelta(
      'Cumulative Layout Shift (CLS)',
      baseline.vitals.cls.value,
      current.vitals.cls.value,
      'score',
      15
    )
  );

  deltas.push(
    computeMetricDelta(
      'First Contentful Paint (FCP)',
      baseline.vitals.fcp.value,
      current.vitals.fcp.value,
      'ms',
      10
    )
  );

  deltas.push(
    computeMetricDelta(
      'Time to First Byte (TTFB)',
      baseline.vitals.ttfb.value,
      current.vitals.ttfb.value,
      'ms',
      15
    )
  );

  // 2. Navigation Timings
  deltas.push(
    computeMetricDelta(
      'Total Page Load Duration',
      baseline.timings.totalDurationMs,
      current.timings.totalDurationMs,
      'ms',
      15
    )
  );

  // 3. Budgets & Asset sizes (if available)
  if (baseline.budgetReport && current.budgetReport) {
    deltas.push(
      computeMetricDelta(
        'Total Transfer Size',
        baseline.budgetReport.totalSizeBytes,
        current.budgetReport.totalSizeBytes,
        'bytes',
        10
      )
    );

    const baseJs = baseline.budgetReport.categories.find((c) => c.category === 'script')?.transferSizeBytes || 0;
    const currJs = current.budgetReport.categories.find((c) => c.category === 'script')?.transferSizeBytes || 0;
    deltas.push(
      computeMetricDelta('JavaScript Bundle Size', baseJs, currJs, 'bytes', 10)
    );

    deltas.push(
      computeMetricDelta(
        'DOM Elements Count',
        baseline.budgetReport.domNodeCount,
        current.budgetReport.domNodeCount,
        'elements',
        15
      )
    );
  }

  const overallScoreDelta = current.overallScore - baseline.overallScore;
  const regressions = deltas.filter((d) => d.isRegression);
  const improvements = deltas.filter((d) => d.percentageDelta < -5);

  const recommendations: string[] = [];
  for (const reg of regressions) {
    if (reg.metricName.includes('LCP')) {
      recommendations.push(
        `LCP increased by ${reg.percentageDelta}%. Optimize largest hero elements, inline critical CSS, and preload hero imagery.`
      );
    } else if (reg.metricName.includes('CLS')) {
      recommendations.push(
        `CLS worsened by +${reg.delta}. Ensure explicit width/height dimensions on images, embeds, and dynamic banners.`
      );
    } else if (reg.metricName.includes('JavaScript')) {
      recommendations.push(
        `JavaScript bundle grew by ${(reg.delta / 1024).toFixed(1)} KB. Audit bundle dependencies and employ dynamic imports.`
      );
    } else if (reg.metricName.includes('TTFB')) {
      recommendations.push(
        `TTFB degraded by ${reg.delta}ms. Check server-side route handlers, SSR database queries, or CDN edge caching.`
      );
    }
  }

  const hasRegression = regressions.length > 0 || overallScoreDelta <= -10;

  return {
    baselineRunId,
    targetRunId,
    hasRegression,
    overallScoreDelta,
    deltas,
    regressionsCount: regressions.length,
    improvementsCount: improvements.length,
    gatePassed: !hasRegression,
    recommendations,
  };
}

/**
 * Evaluates performance regression report against strict gate policy rules.
 */
export function evaluatePerformanceGate(
  report: PerformanceRegressionReport,
  current: PerformanceAuditSummary,
  policy: PerformanceGatePolicy = DEFAULT_PERFORMANCE_GATE
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  // 1. Min overall score check
  if (policy.minOverallScore !== undefined && current.overallScore < policy.minOverallScore) {
    violations.push(
      `Overall performance score (${current.overallScore}) is below required minimum threshold of ${policy.minOverallScore}.`
    );
  }

  // 2. Poor vital check
  if (policy.failOnPoorVital) {
    for (const [key, metric] of Object.entries(current.vitals)) {
      if (metric && metric.rating === 'poor') {
        violations.push(
          `Core Web Vital ${metric.label} (${metric.value}${metric.unit}) is rated POOR (budget limit: ${metric.thresholds.poor}${metric.unit}).`
        );
      }
    }
  }

  // 3. LCP regression percent check
  if (policy.maxLcpRegressionPercent !== undefined) {
    const lcpDelta = report.deltas.find((d) => d.metricName.includes('LCP'));
    if (lcpDelta && lcpDelta.percentageDelta > policy.maxLcpRegressionPercent) {
      violations.push(
        `LCP regressed by ${lcpDelta.percentageDelta}%, exceeding allowed regression limit of ${policy.maxLcpRegressionPercent}%.`
      );
    }
  }

  // 4. CLS regression delta check
  if (policy.maxClsRegressionDelta !== undefined) {
    const clsDelta = report.deltas.find((d) => d.metricName.includes('CLS'));
    if (clsDelta && clsDelta.delta > policy.maxClsRegressionDelta) {
      violations.push(
        `CLS shifted by +${clsDelta.delta}, exceeding allowed regression delta of +${policy.maxClsRegressionDelta}.`
      );
    }
  }

  // 5. Total Size regression check
  if (policy.maxTotalSizeRegressionPercent !== undefined) {
    const sizeDelta = report.deltas.find((d) => d.metricName.includes('Total Transfer Size'));
    if (sizeDelta && sizeDelta.percentageDelta > policy.maxTotalSizeRegressionPercent) {
      violations.push(
        `Total transfer size increased by ${sizeDelta.percentageDelta}%, exceeding budget limit of ${policy.maxTotalSizeRegressionPercent}%.`
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
