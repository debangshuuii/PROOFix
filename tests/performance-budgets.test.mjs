import assert from 'node:assert/strict';
import {
  classifyResourceType,
  aggregateResourceCategories,
  evaluateResourceBudgets,
  DEFAULT_RESOURCE_BUDGETS,
} from '../src/lib/performance/resource-budget.ts';
import {
  THROTTLING_PRESETS,
  applyThrottling,
  resetThrottling,
  getActiveThrottling,
} from '../src/lib/performance/throttling.ts';

console.log('--- Testing Resource Budgets, Asset Size Profiling & Throttling (Contribution 92) ---');

function testResourceClassification() {
  assert.equal(classifyResourceType('script', 'https://cdn.example.com/bundle.js'), 'script');
  assert.equal(classifyResourceType('link', 'https://cdn.example.com/main.css'), 'stylesheet');
  assert.equal(classifyResourceType('img', 'https://cdn.example.com/hero.webp'), 'image');
  assert.equal(classifyResourceType('font', 'https://cdn.example.com/font.woff2'), 'font');
  assert.equal(classifyResourceType('fetch', 'https://cdn.example.com/api/user'), 'fetch');
  assert.equal(classifyResourceType('navigation', 'https://app.proofix.dev/'), 'document');
  assert.equal(classifyResourceType('other', 'https://cdn.example.com/data.bin'), 'other');
  console.log('[PASS] Network resource classification by type and extension verified.');
}

function testResourceAggregation() {
  const sampleResources = [
    { name: 'https://app/index.html', initiatorType: 'navigation', transferSize: 12000, decodedBodySize: 45000 },
    { name: 'https://app/app.js', initiatorType: 'script', transferSize: 180000, decodedBodySize: 600000 },
    { name: 'https://app/vendor.js', initiatorType: 'script', transferSize: 220000, decodedBodySize: 750000 },
    { name: 'https://app/style.css', initiatorType: 'link', transferSize: 35000, decodedBodySize: 140000 },
    { name: 'https://app/banner.png', initiatorType: 'img', transferSize: 450000, decodedBodySize: 450000 },
  ];

  const categories = aggregateResourceCategories(sampleResources);
  const scriptCat = categories.find((c) => c.category === 'script');
  assert.ok(scriptCat);
  assert.equal(scriptCat.count, 2);
  assert.equal(scriptCat.transferSizeBytes, 400000);

  const imgCat = categories.find((c) => c.category === 'image');
  assert.ok(imgCat);
  assert.equal(imgCat.count, 1);
  assert.equal(imgCat.transferSizeBytes, 450000);

  console.log('[PASS] Resource categorization and byte aggregation validated.');
}

function testBudgetEvaluation() {
  // 1. Clean passing budget
  const passingMetrics = {
    resources: [
      { name: 'https://app/app.js', initiatorType: 'script', transferSize: 150000, decodedBodySize: 500000 },
      { name: 'https://app/style.css', initiatorType: 'link', transferSize: 40000, decodedBodySize: 120000 },
    ],
    domNodeCount: 450,
    maxDomDepth: 14,
  };

  const passingReport = evaluateResourceBudgets(passingMetrics);
  assert.equal(passingReport.passed, true);
  assert.equal(passingReport.violations.length, 0);
  assert.equal(passingReport.totalSizeBytes, 190000);
  assert.equal(passingReport.totalRequests, 2);
  console.log('[PASS] Passing budget evaluation succeeds with zero violations.');

  // 2. Budget violation (heavy JS and excessive DOM elements)
  const violatingMetrics = {
    resources: [
      // 800 KB JS (> 500KB limit)
      { name: 'https://app/huge.js', initiatorType: 'script', transferSize: 800 * 1024, decodedBodySize: 2500000 },
      // 2.5 MB image (> 1MB limit)
      { name: 'https://app/uncompressed.png', initiatorType: 'img', transferSize: 2500 * 1024, decodedBodySize: 2500000 },
    ],
    domNodeCount: 2200, // > 1500 limit
    maxDomDepth: 40,   // > 32 limit
  };

  const failingReport = evaluateResourceBudgets(violatingMetrics);
  assert.equal(failingReport.passed, false);
  assert.ok(failingReport.violations.length >= 3);

  const jsViolation = failingReport.violations.find((v) => v.metric === 'javascript_size');
  assert.ok(jsViolation);
  assert.equal(jsViolation.severity, 'error');

  const domViolation = failingReport.violations.find((v) => v.metric === 'dom_nodes');
  assert.ok(domViolation);

  console.log('[PASS] Resource budget violations accurately detected and flagged with severity levels.');
}

async function testThrottlingEngine() {
  // Presets inspection
  const slow3g = THROTTLING_PRESETS['slow-3g'];
  assert.equal(slow3g.latencyMs, 400);
  assert.equal(slow3g.cpuThrottlingRate, 4);

  const fast3g = THROTTLING_PRESETS['fast-3g'];
  assert.equal(fast3g.latencyMs, 150);

  // Mock Playwright page with CDP session
  const mockSentCommands = [];
  const mockCdpSession = {
    send: async (cmd, params) => {
      mockSentCommands.push({ cmd, params });
    },
    detach: async () => {
      mockSentCommands.push({ cmd: 'detach' });
    },
  };

  const mockPage = {
    context: () => ({
      newCDPSession: async () => mockCdpSession,
    }),
  };

  // 1. Apply fast-3g
  await applyThrottling(mockPage, 'fast-3g');
  assert.equal(getActiveThrottling(mockPage), 'fast-3g');
  assert.ok(mockSentCommands.some((c) => c.cmd === 'Network.emulateNetworkConditions'));

  // 2. Reset throttling (must restore full network and 1x CPU)
  await resetThrottling(mockPage);
  assert.equal(getActiveThrottling(mockPage), 'none');
  assert.ok(mockSentCommands.some((c) => c.cmd === 'Emulation.setCPUThrottlingRate' && c.params.rate === 1));
  assert.ok(mockSentCommands.some((c) => c.cmd === 'detach'));

  console.log('[PASS] Network and CPU throttling applied via CDP and reset cleanly without leakage.');
}

async function runSuite() {
  testResourceClassification();
  testResourceAggregation();
  testBudgetEvaluation();
  await testThrottlingEngine();
  console.log('[ALL PASS] Contribution 92 test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
