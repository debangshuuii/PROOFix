import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  provePatchFix,
  proveCandidatePatch,
} from '../src/lib/repair/patch-prover.ts';
import { executeCheckInWorkspace } from '../src/lib/repair/isolated-test-runner.ts';

console.log('===========================================================');
console.log('PROOFix Automated Patch Prover & Regression Test Suite');
console.log('===========================================================\n');

async function runTests() {
  const sampleDir = path.resolve('src/fixtures/sample-app');

  // Test 1: Isolated Test Runner Check Execution
  console.log('[TEST 1] Testing isolated test execution runner for route and syntax checks...');
  const routeCheck = await executeCheckInWorkspace('check-broken-route', sampleDir);
  // In the unmodified sample-app, broken route /broken-route exists
  assert.strictEqual(routeCheck.name, 'route-link-integrity');
  assert.strictEqual(routeCheck.passed, false, 'Route link check must detect broken route link in unpatched fixture');

  const syntaxCheck = await executeCheckInWorkspace('syntax-compile-check', sampleDir);
  assert.strictEqual(syntaxCheck.passed, true, 'Syntax compile check must pass on valid fixture code');
  console.log('  ✓ Isolated check runners executed and returned structured diagnostic results.');

  // Test 2: proveCandidatePatch with Verified Fix
  console.log('\n[TEST 2] Proving candidate patch: Verified Clean Fix...');
  const mockCleanRunner = {
    runCheck: async (checkName) => ({
      passed: true,
      message: `Check "${checkName}" passed successfully.`,
      durationMs: 45,
    }),
  };

  const cleanProposal = {
    id: 'prop_clean_001',
    candidateId: 'cand_clean_01',
    title: 'Replace broken link with valid /about route',
  };

  const cleanReport = await proveCandidatePatch({
    proposal: cleanProposal,
    workspacePath: sampleDir,
    targetCheckName: 'Route Link Integrity',
    regressionCheckNames: ['Accessibility Audit', 'SEO Metadata', 'Hydration Integrity'],
    runner: mockCleanRunner,
  });

  assert.strictEqual(cleanReport.outcome, 'verified_fix');
  assert.strictEqual(cleanReport.failingCheckResolved, true);
  assert.strictEqual(cleanReport.regressionsCount, 0);
  assert.strictEqual(cleanReport.candidateId, 'cand_clean_01');
  assert.strictEqual(cleanReport.regressionCheckResults.length, 3);
  console.log('  ✓ Clean candidate patch correctly proved: 0 regressions across 3 checks.');

  // Test 3: proveCandidatePatch with Regression Detected
  console.log('\n[TEST 3] Proving candidate patch: Regression Alert Detection...');
  const mockRegressionRunner = {
    runCheck: async (checkName) => {
      if (checkName === 'Route Link Integrity') {
        return { passed: true, message: 'Target fixed', durationMs: 40 };
      }
      if (checkName === 'Button Component Clickability') {
        return { passed: false, message: 'Hydration mismatch threw TypeError', durationMs: 60 };
      }
      return { passed: true, message: 'OK', durationMs: 25 };
    },
  };

  const regReport = await proveCandidatePatch({
    proposal: cleanProposal,
    workspacePath: sampleDir,
    targetCheckName: 'Route Link Integrity',
    regressionCheckNames: ['Button Component Clickability', 'Responsive Viewport'],
    runner: mockRegressionRunner,
  });

  assert.strictEqual(regReport.outcome, 'regression_detected');
  assert.strictEqual(regReport.failingCheckResolved, true);
  assert.strictEqual(regReport.regressionsCount, 1);
  assert.ok(regReport.diagnostics.includes('Regression alert'));
  console.log('  ✓ Regression successfully trapped and flagged without applying flawed patch.');

  // Test 4: proveCandidatePatch with Failed Fix
  console.log('\n[TEST 4] Proving candidate patch: Target Fix Failure...');
  const mockFailedRunner = {
    runCheck: async (checkName) => ({
      passed: false,
      message: 'Target link still 404',
      durationMs: 30,
    }),
  };

  const failedReport = await proveCandidatePatch({
    proposal: cleanProposal,
    workspacePath: sampleDir,
    targetCheckName: 'Route Link Integrity',
    regressionCheckNames: ['Adjacent Test A'],
    runner: mockFailedRunner,
  });

  assert.strictEqual(failedReport.outcome, 'failed');
  assert.strictEqual(failedReport.failingCheckResolved, false);
  assert.strictEqual(failedReport.regressionCheckResults.length, 0, 'Should not run regressions if target check failed');
  console.log('  ✓ Ineffective candidate immediately rejected without wasting regression compute.');

  console.log('\n===========================================================');
  console.log('ALL 4 PATCH PROVER & REGRESSION CHECKER TESTS PASSED!');
  console.log('===========================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
