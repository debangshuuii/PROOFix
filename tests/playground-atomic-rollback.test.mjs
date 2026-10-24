import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { db } from '../src/lib/db/index.ts';

test('PlaygroundEngine resets modified scenario state back to baseline', async () => {
  // Launch run
  const launch = await PlaygroundEngine.launchDemoRun('ecommerce_checkout');
  assert.equal(launch.success, true);

  // Apply fix
  const fix = await PlaygroundEngine.applyDemoFix('ecommerce_checkout', launch.runId);
  assert.equal(fix.success, true);

  // Trigger reset
  const resetResult = await PlaygroundEngine.resetScenario('ecommerce_checkout');
  assert.equal(resetResult.success, true);
  assert.ok(resetResult.message.includes('reset to pristine baseline'));

  // Verify baseline run is restored
  const baselineRun = await db.getRunById('run-demo-ecommerce-checkout-baseline');
  assert.ok(baselineRun, 'Baseline run must exist');
  assert.equal(baselineRun.status, 'failed');

  const baselineTests = await db.getTestResults('run-demo-ecommerce-checkout-baseline');
  assert.equal(baselineTests.length, 5);
  const failedTests = baselineTests.filter((t) => t.status === 'failed');
  assert.equal(failedTests.length, 2);
});
