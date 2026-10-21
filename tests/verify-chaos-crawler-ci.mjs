/**
 * PROOFix Master Autonomous Chaos Monkey Crawler CI Suite (Contribution 230)
 *
 * Validates:
 * 1. Chaos crawler state schemas, action contracts, and anomaly types
 * 2. Adversarial edge-case payload generator across all 6 attack vectors
 * 3. Interactive DOM element discovery and priority scoring
 * 4. Directed state graph traversal, cycle trap detection, and BFS reproduction
 * 5. Real-time anomaly sentinel (window.onerror, HTTP 500, layout overflows)
 * 6. Vision-guided heuristic exploration planner
 * 7. Master autonomous crawler controller
 * 8. Chaos crawler API trigger and report endpoint
 * 9. Chaos monkey state graph visualizer UI
 */

import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('🚀 Running PROOFix Autonomous Chaos Monkey Crawler CI Suite...\n');

const testSuites = [
  'tests/chaos-crawler-types.test.mjs',
  'tests/adversarial-payloads.test.mjs',
  'tests/dom-element-discoverer.test.mjs',
  'tests/state-graph-traverser.test.mjs',
  'tests/anomaly-sentinel.test.mjs',
  'tests/vision-heuristic-planner.test.mjs',
  'tests/chaos-monkey-crawler.test.mjs',
  'tests/chaos-crawler-route.test.mjs',
  'tests/chaos-crawler-ui.test.mjs',
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  process.stdout.write(`  ⏳ Running ${suite}... `);
  try {
    execSync(`node ${suite}`, { stdio: 'pipe' });
    console.log('✅ PASS');
    totalPassed++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    totalFailed++;
  }
}

console.log('\n---------------------------------------------------------');
console.log(`📊 Chaos Monkey Crawler Verification Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('---------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Autonomous Chaos Monkey Crawler verification gates PASSED successfully!\n');
}
