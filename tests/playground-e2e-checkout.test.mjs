import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { db } from '../src/lib/db/index.ts';

test('E-Commerce Checkout End-to-End Simulation Workflow', async () => {
  // 1. Launch scenario
  const launch = await PlaygroundEngine.launchDemoRun('ecommerce_checkout');
  assert.equal(launch.success, true);
  assert.equal(launch.scenarioId, 'ecommerce_checkout');
  assert.equal(launch.faultDetected, true);

  // 2. Inspect failing run in DB
  const initialRun = await db.getRunById(launch.runId);
  assert.ok(initialRun);
  assert.equal(initialRun.status, 'failed');

  const initialTests = await db.getTestResults(launch.runId);
  assert.equal(initialTests.length, 5);

  const failedTests = initialTests.filter((t) => t.status === 'failed');
  assert.equal(failedTests.length, 2);

  const missingRouteTest = initialTests.find((t) => t.name.includes('/api/checkout'));
  assert.ok(missingRouteTest);
  assert.equal(missingRouteTest.httpStatus, 404);

  // 3. Apply fix
  const fix = await PlaygroundEngine.applyDemoFix('ecommerce_checkout', launch.runId);
  assert.equal(fix.success, true);
  assert.equal(fix.patchApplied, true);
  assert.equal(fix.status, 'passed');

  // 4. Inspect verified run in DB
  const verifiedRun = await db.getRunById(fix.verifiedRunId);
  assert.ok(verifiedRun);
  assert.equal(verifiedRun.status, 'completed');
  assert.equal(verifiedRun.summary?.failed, 0);
  assert.equal(verifiedRun.summary?.passed, 5);

  const verifiedTests = await db.getTestResults(fix.verifiedRunId);
  assert.ok(verifiedTests.every((t) => t.status === 'passed'));
});
