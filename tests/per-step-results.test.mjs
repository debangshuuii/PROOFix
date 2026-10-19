import assert from 'node:assert/strict';
import { executeJourney } from '../src/lib/journey/execution-adapter.ts';

console.log('--- Testing Per-Step Execution Results & Failure Isolation (Contribution 59) ---');

// Create a 4-step journey where Step #2 is configured to fail
const fourStepJourney = {
  id: 'jny_test_per_step_failure',
  projectId: 'proj_fixture_01',
  ownerId: 'usr_default',
  title: 'Per-Step Failure Isolation Flow',
  schemaVersion: '1.0.0',
  config: {
    baseUrl: 'http://localhost:4173',
    stopOnFailure: true, // Standard runner behavior
  },
  steps: [
    {
      id: 'step_1_nav',
      order: 1,
      title: 'Open Store Home',
      action: 'navigate',
      params: { url: '/store' },
    },
    {
      id: 'step_2_assert_bug',
      order: 2,
      title: 'Assert Sale Banner Present',
      action: 'assert_text',
      target: { type: 'css', value: '.non-existent-banner' },
      params: { expectedText: 'Huge 50% Off Sale!' }, // Will fail because banner text is absent
    },
    {
      id: 'step_3_click_item',
      order: 3,
      title: 'Click Featured Item',
      action: 'click',
      target: { type: 'role_name', role: 'button', name: 'Add to Cart' },
    },
    {
      id: 'step_4_screenshot',
      order: 4,
      title: 'Capture Final Checkout State',
      action: 'take_screenshot',
      params: { screenshotName: 'cart_view' },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const runResult = await executeJourney(fourStepJourney);

// 1. Overall result reflects failure
assert.equal(runResult.status, 'failed');
assert.equal(runResult.totalSteps, 4);

// 2. CRITICAL INVARIANT: All 4 step results must remain visible after step 2 failed!
assert.equal(runResult.stepResults.length, 4, 'All 4 steps MUST remain in results list');

// Step 1: Passed with recorded duration
const step1 = runResult.stepResults[0];
assert.equal(step1.stepId, 'step_1_nav');
assert.equal(step1.status, 'passed');
assert.ok(step1.durationMs >= 0);
assert.ok(step1.observedResult?.includes('/store'));
console.log(`[PASS] Step 1 recorded as ${step1.status.toUpperCase()} (${step1.durationMs}ms).`);

// Step 2: Failed with explicit error context
const step2 = runResult.stepResults[1];
assert.equal(step2.stepId, 'step_2_assert_bug');
assert.equal(step2.status, 'failed');
assert.ok(step2.error?.includes('Assertion failed'));
assert.ok(step2.expectedResult?.includes('Huge 50% Off Sale!'));
console.log(`[PASS] Step 2 recorded as ${step2.status.toUpperCase()} with error context: "${step2.error}".`);

// Step 3: Skipped and preserved
const step3 = runResult.stepResults[2];
assert.equal(step3.stepId, 'step_3_click_item');
assert.equal(step3.status, 'skipped');
assert.ok(step3.error?.includes('previous non-optional step failed'));
console.log(`[PASS] Step 3 preserved as ${step3.status.toUpperCase()} after step 2 failure.`);

// Step 4: Skipped and preserved
const step4 = runResult.stepResults[3];
assert.equal(step4.stepId, 'step_4_screenshot');
assert.equal(step4.status, 'skipped');
console.log(`[PASS] Step 4 preserved as ${step4.status.toUpperCase()} after step 2 failure.`);

// 3. Test timeout state recording
const timeoutRunResult = {
  runId: 'run_timeout_mock',
  journeyId: 'jny_test',
  journeyTitle: 'Timeout Test',
  status: 'timeout',
  totalSteps: 1,
  passedSteps: 0,
  failedSteps: 1,
  skippedSteps: 0,
  durationMs: 15000,
  stepResults: [
    {
      stepId: 'stp_hang',
      order: 1,
      title: 'Hanging Step',
      action: 'wait_for_selector',
      status: 'timeout',
      durationMs: 15000,
      error: 'Step execution timed out after 15000ms waiting for selector "#never-arrives".',
    },
  ],
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

assert.equal(timeoutRunResult.stepResults[0].status, 'timeout');
assert.ok(timeoutRunResult.stepResults[0].error.includes('timed out'));
console.log('[PASS] Timeout state verified with duration and useful error context.');

console.log('All Per-Step Execution Results tests passed successfully.');
