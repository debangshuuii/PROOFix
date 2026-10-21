/**
 * PROOFix Master Native Git Integrations & Webhook Ingestion CI Suite (Contribution 200)
 *
 * Validates:
 * 1. Cryptographic HMAC-SHA256 signature verification & timing-attack resistance
 * 2. GitHub Webhook ingestion (pull_request, push, check_run)
 * 3. GitLab Webhook ingestion (Merge Request Hook, Push Hook)
 * 4. GitHub Check Run payload generation with Playwright screenshots & performance budgets
 * 5. Pull Request review comment synthesis with unified diff patches & 1-click self-healing links
 * 6. Merge gating coordination and status lifecycle transitions
 */

import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('🚀 Running PROOFix Native Git Integrations & Webhook Ingestion CI Suite...\n');

const testSuites = [
  'tests/git-integrations-types.test.mjs',
  'tests/webhook-verifier.test.mjs',
  'tests/github-parser.test.mjs',
  'tests/gitlab-parser.test.mjs',
  'tests/check-run-formatter.test.mjs',
  'tests/pr-comment-synthesizer.test.mjs',
  'tests/git-webhook-routes.test.mjs',
  'tests/ci-gating-coordinator.test.mjs',
  'tests/git-integration-ui.test.mjs',
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
console.log(`📊 Git Integrations Verification Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('---------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Native Git Integration verification gates PASSED successfully!\n');
}
