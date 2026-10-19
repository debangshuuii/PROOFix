import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  executeBoundedWait,
  resolveStepScreenshotPath,
  ABSOLUTE_MAX_WAIT_MS,
} from '../src/lib/journey/wait-screenshot-handler.ts';

console.log('--- Testing Bounded Waits & Step Screenshots (Contribution 56) ---');

// 1. Normal wait within bounds
async function testBoundedWaits() {
  const normal = await executeBoundedWait(2000);
  assert.equal(normal.waitedMs, 2000);
  assert.equal(normal.clamped, false);

  // 2. Excessive wait duration MUST be clamped (waits cannot run indefinitely)
  const excessive = await executeBoundedWait(99999999);
  assert.equal(excessive.waitedMs, ABSOLUTE_MAX_WAIT_MS);
  assert.equal(excessive.clamped, true);
  console.log(`[PASS] Excessive wait of 99999999ms strictly bounded to ${ABSOLUTE_MAX_WAIT_MS}ms max.`);

  // 3. Custom max allowed limit
  const customLimit = await executeBoundedWait(10000, 5000);
  assert.equal(customLimit.waitedMs, 5000);
  assert.equal(customLimit.clamped, true);
  console.log('[PASS] Wait bounded to custom per-journey maximum.');

  // 4. Reject negative durations
  await assert.rejects(async () => {
    await executeBoundedWait(-500);
  }, /Negative wait duration/);
  console.log('[PASS] Negative wait durations rejected.');
}

// 5. Screenshot attachment to correct step
async function testScreenshotAttachment() {
  const testRunId = `run_shot_test_${Date.now()}`;
  const stepId = 'stp_checkout_confirm';
  const stepOrder = 4;

  const result = await resolveStepScreenshotPath({
    runId: testRunId,
    stepId,
    stepOrder,
    screenshotName: 'order_confirmation',
  });

  // Verify attachment to correct step
  assert.equal(result.stepId, stepId, 'Screenshot MUST be attached to the correct stepId');
  assert.equal(result.stepOrder, stepOrder, 'Screenshot MUST be attached to the correct stepOrder');
  assert.ok(result.screenshotPath.includes(`stp_${stepOrder}_order_confirmation.png`));
  assert.ok(fs.existsSync(result.diskPath), 'Screenshot artifact file must exist on disk');
  console.log(`[PASS] Screenshot attached to Step #${result.stepOrder} (${result.stepId}) at ${result.screenshotPath}.`);

  // Clean up test artifact directory
  const testDir = path.dirname(result.diskPath);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runAll() {
  await testBoundedWaits();
  await testScreenshotAttachment();
  console.log('All Bounded Wait and Screenshot tests passed successfully.');
}

runAll().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
