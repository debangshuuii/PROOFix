import assert from 'node:assert/strict';
import {
  rateMetric,
  buildVitalMetric,
  calculateOverallPerformanceScore,
  collectPageVitals,
  STANDARD_THRESHOLDS,
} from '../src/lib/performance/vitals-collector.ts';

console.log('--- Testing Core Web Vitals & Real-Time Performance Measurement (Contribution 91) ---');

function testStandardMetricRating() {
  // LCP: good <= 2500, poor > 4000
  assert.equal(rateMetric('lcp', 1500), 'good');
  assert.equal(rateMetric('lcp', 2500), 'good');
  assert.equal(rateMetric('lcp', 3200), 'needs-improvement');
  assert.equal(rateMetric('lcp', 4000), 'needs-improvement');
  assert.equal(rateMetric('lcp', 4500), 'poor');

  // CLS: good <= 0.1, poor > 0.25
  assert.equal(rateMetric('cls', 0.02), 'good');
  assert.equal(rateMetric('cls', 0.10), 'good');
  assert.equal(rateMetric('cls', 0.18), 'needs-improvement');
  assert.equal(rateMetric('cls', 0.30), 'poor');

  // FCP: good <= 1800, poor > 3000
  assert.equal(rateMetric('fcp', 1000), 'good');
  assert.equal(rateMetric('fcp', 2400), 'needs-improvement');
  assert.equal(rateMetric('fcp', 3800), 'poor');

  // TTFB: good <= 800, poor > 1800
  assert.equal(rateMetric('ttfb', 250), 'good');
  assert.equal(rateMetric('ttfb', 1200), 'needs-improvement');
  assert.equal(rateMetric('ttfb', 2200), 'poor');

  // Edge cases: null, undefined, NaN
  assert.equal(rateMetric('lcp', null), 'unknown');
  assert.equal(rateMetric('lcp', undefined), 'unknown');
  assert.equal(rateMetric('lcp', NaN), 'unknown');
  assert.equal(rateMetric('unknown_metric', 100), 'unknown');

  console.log('[PASS] Metric ratings accurately match standard Google Web Vitals thresholds.');
}

function testVitalMetricBuilder() {
  const lcp = buildVitalMetric('lcp', 2150.456);
  assert.equal(lcp.name, 'lcp');
  assert.equal(lcp.label, 'Largest Contentful Paint');
  assert.equal(lcp.value, 2150.46);
  assert.equal(lcp.unit, 'ms');
  assert.equal(lcp.rating, 'good');
  assert.equal(lcp.thresholds.good, 2500);
  assert.equal(lcp.thresholds.poor, 4000);

  const cls = buildVitalMetric('cls', 0.28);
  assert.equal(cls.rating, 'poor');
  assert.equal(cls.unit, 'score');

  console.log('[PASS] VitalMetric builder generates clean metadata and threshold models.');
}

function testScoreCalculations() {
  // Case 1: Excellent performance
  const goodVitals = {
    lcp: buildVitalMetric('lcp', 1200),
    cls: buildVitalMetric('cls', 0.01),
    fcp: buildVitalMetric('fcp', 600),
    ttfb: buildVitalMetric('ttfb', 150),
  };
  const goodSummary = calculateOverallPerformanceScore(goodVitals);
  assert.ok(goodSummary.score >= 90, `Score must be >= 90, got ${goodSummary.score}`);
  assert.equal(goodSummary.rating, 'good');

  // Case 2: Poor performance (heavy LCP and high layout shifts)
  const poorVitals = {
    lcp: buildVitalMetric('lcp', 5500),
    cls: buildVitalMetric('cls', 0.45),
    fcp: buildVitalMetric('fcp', 3500),
    ttfb: buildVitalMetric('ttfb', 2100),
  };
  const poorSummary = calculateOverallPerformanceScore(poorVitals);
  assert.ok(poorSummary.score < 50, `Score must be < 50, got ${poorSummary.score}`);
  assert.equal(poorSummary.rating, 'poor');

  console.log('[PASS] Weighted overall performance score and rating calculation validated.');
}

async function testPageVitalsCollector() {
  // Mock page with synthetic browser evaluation
  const mockPage = {
    url: () => 'https://app.proofix.dev/dashboard',
    evaluate: async () => ({
      timings: {
        dnsLookupMs: 15,
        tcpConnectionMs: 25,
        tlsHandshakeMs: 20,
        ttfbMs: 85,
        contentDownloadMs: 45,
        domContentLoadedMs: 320,
        loadEventMs: 510,
        totalDurationMs: 510,
      },
      fcp: 280,
      lcp: 820,
      cls: 0.02,
      ttfb: 85,
    }),
  };

  const summary = await collectPageVitals(mockPage);
  assert.equal(summary.url, 'https://app.proofix.dev/dashboard');
  assert.equal(summary.vitals.lcp.rating, 'good');
  assert.equal(summary.vitals.cls.rating, 'good');
  assert.equal(summary.vitals.fcp.rating, 'good');
  assert.equal(summary.vitals.ttfb.rating, 'good');
  assert.ok(summary.overallScore >= 90);
  assert.equal(summary.timings.totalDurationMs, 510);
  console.log('[PASS] Page vitals collected from browser evaluation and parsed accurately.');

  // Safe fallback test: Page that throws an error
  const failingPage = {
    url: () => 'https://app.proofix.dev/crashed',
    evaluate: async () => {
      throw new Error('Target page crashed');
    },
  };

  const fallbackSummary = await collectPageVitals(failingPage);
  assert.equal(fallbackSummary.url, 'https://app.proofix.dev/crashed');
  assert.ok(fallbackSummary.vitals.lcp.value !== null);
  assert.ok(fallbackSummary.overallScore > 0);
  console.log('[PASS] Unresponsive or crashing page handled safely without unhandled exceptions.');
}

async function runSuite() {
  testStandardMetricRating();
  testVitalMetricBuilder();
  testScoreCalculations();
  await testPageVitalsCollector();
  console.log('[ALL PASS] Contribution 91 test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
