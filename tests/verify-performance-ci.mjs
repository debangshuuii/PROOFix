/**
 * PROOFix Master Performance Auditing CI Regression Test Suite
 * Covering Contributions 91 through 93
 */

import assert from 'node:assert/strict';
import {
  rateMetric,
  buildVitalMetric,
  calculateOverallPerformanceScore,
  collectPageVitals,
} from '../src/lib/performance/vitals-collector.ts';
import {
  classifyResourceType,
  aggregateResourceCategories,
  evaluateResourceBudgets,
} from '../src/lib/performance/resource-budget.ts';
import {
  THROTTLING_PRESETS,
  applyThrottling,
  resetThrottling,
  getActiveThrottling,
} from '../src/lib/performance/throttling.ts';
import {
  computeMetricDelta,
  detectPerformanceRegressions,
  evaluatePerformanceGate,
  DEFAULT_PERFORMANCE_GATE,
} from '../src/lib/performance/regression-detector.ts';

console.log('================================================================');
console.log(' PROOFix Master Performance Auditing CI Regression Suite        ');
console.log(' Feature: Contributions 91–93                                   ');
console.log('================================================================\n');

async function runMasterPerformanceSuite() {
  // ---------------------------------------------------------
  // Test 1: Core Web Vitals & Real-Time Engine (Contribution 91)
  // ---------------------------------------------------------
  console.log('Test 1: Core Web Vitals Ratings & Score Calculations...');
  assert.equal(rateMetric('lcp', 1800), 'good');
  assert.equal(rateMetric('lcp', 3200), 'needs-improvement');
  assert.equal(rateMetric('lcp', 4800), 'poor');

  assert.equal(rateMetric('cls', 0.05), 'good');
  assert.equal(rateMetric('cls', 0.18), 'needs-improvement');
  assert.equal(rateMetric('cls', 0.35), 'poor');

  assert.equal(rateMetric('fcp', 1200), 'good');
  assert.equal(rateMetric('ttfb', 250), 'good');

  const baselineVitals = {
    lcp: buildVitalMetric('lcp', 1400),
    cls: buildVitalMetric('cls', 0.02),
    fcp: buildVitalMetric('fcp', 700),
    ttfb: buildVitalMetric('ttfb', 150),
  };
  const scoreResult = calculateOverallPerformanceScore(baselineVitals);
  assert.ok(scoreResult.score >= 90);
  assert.equal(scoreResult.rating, 'good');
  console.log('  -> [PASS] Core Web Vitals thresholds and weighted score calculation verified.\n');

  // ---------------------------------------------------------
  // Test 2: In-Browser Page Metrics Collection & Resilience (Contribution 91)
  // ---------------------------------------------------------
  console.log('Test 2: Page Vitals Collection & Unresponsive Handling...');
  const mockPage = {
    url: () => 'https://app.proofix.dev/',
    evaluate: async () => ({
      timings: {
        dnsLookupMs: 12,
        tcpConnectionMs: 20,
        tlsHandshakeMs: 15,
        ttfbMs: 70,
        contentDownloadMs: 40,
        domContentLoadedMs: 280,
        loadEventMs: 450,
        totalDurationMs: 450,
      },
      fcp: 240,
      lcp: 650,
      cls: 0.01,
      ttfb: 70,
    }),
  };

  const summary = await collectPageVitals(mockPage);
  assert.equal(summary.url, 'https://app.proofix.dev/');
  assert.equal(summary.vitals.lcp.rating, 'good');
  assert.equal(summary.timings.totalDurationMs, 450);

  // Unhandled exception resilience
  const crashingPage = {
    url: () => 'https://app.proofix.dev/crash',
    evaluate: async () => {
      throw new Error('Page crashed unexpectedly');
    },
  };
  const fallbackSummary = await collectPageVitals(crashingPage);
  assert.ok(fallbackSummary.vitals.lcp.value !== null);
  console.log('  -> [PASS] Page vitals collection extracted and crashes handled without failure.\n');

  // ---------------------------------------------------------
  // Test 3: Resource Categorization & Budget Limits (Contribution 92)
  // ---------------------------------------------------------
  console.log('Test 3: Resource Budgets & Asset Breakdown...');
  const sampleResources = [
    { name: 'https://app/index.html', initiatorType: 'navigation', transferSize: 15000, decodedBodySize: 50000 },
    { name: 'https://app/bundle.js', initiatorType: 'script', transferSize: 320000, decodedBodySize: 1200000 },
    { name: 'https://app/styles.css', initiatorType: 'link', transferSize: 45000, decodedBodySize: 180000 },
    { name: 'https://app/hero.webp', initiatorType: 'img', transferSize: 250000, decodedBodySize: 250000 },
  ];

  const categories = aggregateResourceCategories(sampleResources);
  assert.equal(categories.find((c) => c.category === 'script')?.count, 1);
  assert.equal(categories.find((c) => c.category === 'script')?.transferSizeBytes, 320000);

  const budgetCheck = evaluateResourceBudgets({
    resources: sampleResources,
    domNodeCount: 520,
    maxDomDepth: 14,
  });
  assert.equal(budgetCheck.passed, true);
  assert.equal(budgetCheck.violations.length, 0);

  // Over-budget check (JS size > 500KB)
  const heavyResources = [
    ...sampleResources,
    { name: 'https://app/huge.js', initiatorType: 'script', transferSize: 400000, decodedBodySize: 1500000 },
  ];
  const overBudgetCheck = evaluateResourceBudgets({
    resources: heavyResources,
    domNodeCount: 2000,
    maxDomDepth: 35,
  });
  assert.equal(overBudgetCheck.passed, false);
  assert.ok(overBudgetCheck.violations.some((v) => v.metric === 'javascript_size'));
  assert.ok(overBudgetCheck.violations.some((v) => v.metric === 'dom_nodes'));
  console.log('  -> [PASS] Resource classification, byte aggregation, and budget violations verified.\n');

  // ---------------------------------------------------------
  // Test 4: Network & CPU Throttling Engine (Contribution 92)
  // ---------------------------------------------------------
  console.log('Test 4: Network Throttling Presets & Rollback...');
  const mockCdpCommands = [];
  const cdpMock = {
    send: async (cmd, params) => {
      mockCdpCommands.push({ cmd, params });
    },
    detach: async () => {
      mockCdpCommands.push({ cmd: 'detach' });
    },
  };
  const throttlePage = {
    context: () => ({
      newCDPSession: async () => cdpMock,
    }),
  };

  await applyThrottling(throttlePage, 'slow-3g');
  assert.equal(getActiveThrottling(throttlePage), 'slow-3g');
  assert.ok(mockCdpCommands.some((c) => c.cmd === 'Emulation.setCPUThrottlingRate' && c.params.rate === 4));

  await resetThrottling(throttlePage);
  assert.equal(getActiveThrottling(throttlePage), 'none');
  assert.ok(mockCdpCommands.some((c) => c.cmd === 'detach'));
  console.log('  -> [PASS] Throttling profiles applied and reset cleanly without state leaks.\n');

  // ---------------------------------------------------------
  // Test 5: Regression Detection & Gate Policies (Contribution 93)
  // ---------------------------------------------------------
  console.log('Test 5: Performance Regression & Policy Gates...');
  const baselineRun = {
    url: 'https://app.proofix.dev/',
    measuredAt: new Date().toISOString(),
    throttling: 'none',
    overallScore: 92,
    rating: 'good',
    vitals: baselineVitals,
    timings: {
      dnsLookupMs: 10,
      tcpConnectionMs: 15,
      tlsHandshakeMs: 12,
      ttfbMs: 150,
      contentDownloadMs: 40,
      domContentLoadedMs: 300,
      loadEventMs: 480,
      totalDurationMs: 480,
    },
    budgetReport: {
      passed: true,
      violations: [],
      totalSizeBytes: 400000,
      totalRequests: 10,
      domNodeCount: 400,
      maxDomDepth: 12,
      categories: [
        { category: 'script', count: 4, transferSizeBytes: 200000, decodedSizeBytes: 600000 },
      ],
    },
  };

  const regressedRun = {
    url: 'https://app.proofix.dev/',
    measuredAt: new Date().toISOString(),
    throttling: 'none',
    overallScore: 64,
    rating: 'needs-improvement',
    vitals: {
      lcp: buildVitalMetric('lcp', 3100), // Severe LCP regression
      cls: buildVitalMetric('cls', 0.03),
      fcp: buildVitalMetric('fcp', 1100),
      ttfb: buildVitalMetric('ttfb', 160),
    },
    timings: {
      dnsLookupMs: 10,
      tcpConnectionMs: 15,
      tlsHandshakeMs: 12,
      ttfbMs: 160,
      contentDownloadMs: 45,
      domContentLoadedMs: 700,
      loadEventMs: 1100,
      totalDurationMs: 1100,
    },
    budgetReport: {
      passed: true,
      violations: [],
      totalSizeBytes: 650000,
      totalRequests: 18,
      domNodeCount: 420,
      maxDomDepth: 12,
      categories: [
        { category: 'script', count: 8, transferSizeBytes: 420000, decodedSizeBytes: 1300000 },
      ],
    },
  };

  const regressionReport = detectPerformanceRegressions(baselineRun, regressedRun, 'base', 'target');
  assert.equal(regressionReport.hasRegression, true);
  assert.ok(regressionReport.regressionsCount >= 2);
  assert.ok(regressionReport.recommendations.some((r) => r.includes('LCP')));

  const gateResult = evaluatePerformanceGate(regressionReport, regressedRun, DEFAULT_PERFORMANCE_GATE);
  assert.equal(gateResult.passed, false);
  assert.ok(gateResult.violations.length > 0);
  console.log('  -> [PASS] Performance regression accurately flagged and blocked by gate policy.\n');

  console.log('================================================================');
  console.log(' [ALL PASS] All Performance Auditing Contributions Verified!   ');
  console.log(' Contributions 91–93 Completed, Hardened & Tested Successfully.');
  console.log('================================================================');
}

runMasterPerformanceSuite().catch((err) => {
  console.error('[FAIL] Master regression suite error:', err);
  process.exit(1);
});
