import assert from 'node:assert/strict';
import { provePatchFix } from '../src/lib/repair/patch-prover.ts';

console.log('--- Testing Post-Patch Verification Prover & Regression Auditor (Contribution 6 / 106) ---');

async function testPostPatchProver() {
  const proposal = {
    id: 'prop_test_prover_01',
    projectId: 'proj_01',
    runId: 'run_01',
    failureId: 'fail_01',
    commitSha: 'a1b2c3d',
    explanation: 'Fix null access',
    proposedChanges: '--- a/page.tsx\n+++ b/page.tsx\n',
    affectedFiles: ['src/app/page.tsx'],
    confidenceScore: 85,
    validationStatus: 'valid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Case 1: Verified Fix (target check passes, 2 regression checks pass)
  const successRunner = {
    runCheck: async (name) => ({ passed: true, message: `Check ${name} passed`, durationMs: 40 }),
  };

  const cleanReport = await provePatchFix(
    proposal,
    '/tmp/workspace',
    'Root Route Health',
    ['Navigation /about', 'Button Interaction'],
    successRunner
  );

  assert.equal(cleanReport.outcome, 'verified_fix');
  assert.equal(cleanReport.failingCheckResolved, true);
  assert.equal(cleanReport.regressionsCount, 0);
  assert.ok(cleanReport.diagnostics.includes('successfully verified'));
  console.log('[PASS] Verified fix confirmed when target check and all regression checks pass.');

  // Case 2: Regression Detected (target check passes, but adjacent check breaks)
  const regressionRunner = {
    runCheck: async (name) => {
      if (name === 'Button Interaction') {
        return { passed: false, message: 'Button threw exception', durationMs: 50 };
      }
      return { passed: true, message: 'Passed', durationMs: 40 };
    },
  };

  const regReport = await provePatchFix(
    proposal,
    '/tmp/workspace',
    'Root Route Health',
    ['Navigation /about', 'Button Interaction'],
    regressionRunner
  );

  assert.equal(regReport.outcome, 'regression_detected');
  assert.equal(regReport.failingCheckResolved, true);
  assert.equal(regReport.regressionsCount, 1);
  assert.ok(regReport.diagnostics.includes('Regression alert'));
  console.log('[PASS] Regression auditor successfully catches unintended side-effects in adjacent tests.');

  // Case 3: Failed (target check still fails)
  const failingRunner = {
    runCheck: async (name) => ({ passed: false, message: 'Still failing', durationMs: 40 }),
  };

  const failReport = await provePatchFix(
    proposal,
    '/tmp/workspace',
    'Root Route Health',
    ['Navigation /about'],
    failingRunner
  );

  assert.equal(failReport.outcome, 'failed');
  assert.equal(failReport.failingCheckResolved, false);
  console.log('[PASS] Unsuccessful patch correctly classified as failed.');
}

async function runSuite() {
  await testPostPatchProver();
  console.log('[ALL PASS] Contribution 6 (106) test suite passed.');
}

runSuite();
