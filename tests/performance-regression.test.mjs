import assert from 'node:assert/strict';
import {
  computeMetricDelta,
  detectPerformanceRegressions,
  evaluatePerformanceGate,
  DEFAULT_PERFORMANCE_GATE,
} from '../src/lib/performance/regression-detector.ts';
import { buildVitalMetric } from '../src/lib/performance/vitals-collector.ts';

console.log('--- Testing Performance Regression Detection & Gate Policies (Contribution 93) ---');

function testMetricDeltaComputation() {
  // 1. Regression delta (increase > 5%)
  const regDelta = computeMetricDelta('LCP', 1000, 1300, 'ms', 5);
  assert.equal(regDelta.delta, 300);
  assert.equal(regDelta.percentageDelta, 30);
  assert.equal(regDelta.isRegression, true);

  // 2. Minor fluctuation within tolerance (increase <= 5%)
  const minorDelta = computeMetricDelta('LCP', 1000, 1030, 'ms', 5);
  assert.equal(minorDelta.delta, 30);
  assert.equal(minorDelta.percentageDelta, 3);
  assert.equal(minorDelta.isRegression, false);

  // 3. Improvement (decrease)
  const impDelta = computeMetricDelta('Total Duration', 800, 600, 'ms', 5);
  assert.equal(impDelta.delta, -200);
  assert.equal(impDelta.percentageDelta, -25);
  assert.equal(impDelta.isRegression, false);

  console.log('[PASS] Metric deltas and regression classification computed with precision.');
}

function testRegressionDetection() {
  const baseline = {
    url: 'https://app.proofix.dev/',
    measuredAt: new Date().toISOString(),
    throttling: 'none',
    overallScore: 92,
    rating: 'good',
    vitals: {
      lcp: buildVitalMetric('lcp', 1200),
      cls: buildVitalMetric('cls', 0.02),
      fcp: buildVitalMetric('fcp', 650),
      ttfb: buildVitalMetric('ttfb', 120),
    },
    timings: {
      dnsLookupMs: 10,
      tcpConnectionMs: 15,
      tlsHandshakeMs: 12,
      ttfbMs: 120,
      contentDownloadMs: 35,
      domContentLoadedMs: 300,
      loadEventMs: 500,
      totalDurationMs: 500,
    },
    budgetReport: {
      passed: true,
      violations: [],
      totalSizeBytes: 300000,
      totalRequests: 10,
      domNodeCount: 400,
      maxDomDepth: 12,
      categories: [
        { category: 'script', count: 4, transferSizeBytes: 180000, decodedSizeBytes: 500000 },
      ],
    },
  };

  // Target run with severe LCP and JS bundle regression
  const current = {
    url: 'https://app.proofix.dev/',
    measuredAt: new Date().toISOString(),
    throttling: 'none',
    overallScore: 68,
    rating: 'needs-improvement',
    vitals: {
      lcp: buildVitalMetric('lcp', 2900), // +141.7% regression
      cls: buildVitalMetric('cls', 0.03),
      fcp: buildVitalMetric('fcp', 900),
      ttfb: buildVitalMetric('ttfb', 130),
    },
    timings: {
      dnsLookupMs: 10,
      tcpConnectionMs: 15,
      tlsHandshakeMs: 12,
      ttfbMs: 130,
      contentDownloadMs: 40,
      domContentLoadedMs: 650,
      loadEventMs: 980,
      totalDurationMs: 980, // +96% duration
    },
    budgetReport: {
      passed: true,
      violations: [],
      totalSizeBytes: 520000,
      totalRequests: 15,
      domNodeCount: 450,
      maxDomDepth: 12,
      categories: [
        { category: 'script', count: 8, transferSizeBytes: 350000, decodedSizeBytes: 950000 }, // +94.4% JS size
      ],
    },
  };

  const report = detectPerformanceRegressions(baseline, current, 'run_base', 'run_target');
  assert.equal(report.hasRegression, true);
  assert.ok(report.overallScoreDelta < -15, 'Overall score should drop significantly');
  assert.ok(report.regressionsCount >= 2, 'Should identify multiple regressions');
  assert.ok(report.recommendations.some((r) => r.includes('LCP')));
  assert.ok(report.recommendations.some((r) => r.includes('JavaScript')));

  console.log('[PASS] Full run regression detection successfully flags regressions and provides recommendations.');
}

function testPerformanceGatePolicies() {
  const passingReport = {
    baselineRunId: 'run_1',
    targetRunId: 'run_2',
    hasRegression: false,
    overallScoreDelta: 2,
    deltas: [
      { metricName: 'Largest Contentful Paint (LCP)', baselineValue: 1200, currentValue: 1220, delta: 20, percentageDelta: 1.7, isRegression: false, unit: 'ms' },
    ],
    regressionsCount: 0,
    improvementsCount: 1,
    gatePassed: true,
    recommendations: [],
  };

  const passingSummary = {
    overallScore: 88,
    rating: 'good',
    vitals: {
      lcp: buildVitalMetric('lcp', 1220),
      cls: buildVitalMetric('cls', 0.01),
      fcp: buildVitalMetric('fcp', 600),
      ttfb: buildVitalMetric('ttfb', 100),
    },
  };

  // 1. Pass with default policy
  const passCheck = evaluatePerformanceGate(passingReport, passingSummary, DEFAULT_PERFORMANCE_GATE);
  assert.equal(passCheck.passed, true);
  assert.equal(passCheck.violations.length, 0);

  // 2. Fail when overall score is too low
  const lowScoreSummary = {
    ...passingSummary,
    overallScore: 55, // below default 65
  };
  const failScoreCheck = evaluatePerformanceGate(passingReport, lowScoreSummary, DEFAULT_PERFORMANCE_GATE);
  assert.equal(failScoreCheck.passed, false);
  assert.ok(failScoreCheck.violations.some((v) => v.includes('Overall performance score')));

  // 3. Fail when a vital is POOR
  const poorVitalSummary = {
    ...passingSummary,
    vitals: {
      ...passingSummary.vitals,
      lcp: buildVitalMetric('lcp', 4500), // Poor (> 4000ms)
    },
  };
  const failPoorCheck = evaluatePerformanceGate(passingReport, poorVitalSummary, DEFAULT_PERFORMANCE_GATE);
  assert.equal(failPoorCheck.passed, false);
  assert.ok(failPoorCheck.violations.some((v) => v.includes('POOR')));

  // 4. Fail when LCP regresses beyond allowed limit
  const lcpRegressedReport = {
    ...passingReport,
    deltas: [
      { metricName: 'Largest Contentful Paint (LCP)', baselineValue: 1200, currentValue: 1800, delta: 600, percentageDelta: 50, isRegression: true, unit: 'ms' },
    ],
  };
  const failLcpCheck = evaluatePerformanceGate(lcpRegressedReport, passingSummary, {
    maxLcpRegressionPercent: 20,
  });
  assert.equal(failLcpCheck.passed, false);
  assert.ok(failLcpCheck.violations.some((v) => v.includes('exceeding allowed regression limit')));

  console.log('[PASS] Performance gate policies enforce deterministic pass/fail rules against regressions.');
}

function runSuite() {
  testMetricDeltaComputation();
  testRegressionDetection();
  testPerformanceGatePolicies();
  console.log('[ALL PASS] Contribution 93 test suite passed.');
}

runSuite();
