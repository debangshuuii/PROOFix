import assert from 'node:assert/strict';
import { StepController } from '../src/lib/companion/step-controller.ts';
import { BreakpointManager } from '../src/lib/companion/breakpoint-manager.ts';
import { TelemetryBroadcaster } from '../src/lib/companion/telemetry-broadcaster.ts';

console.log('--- Testing Interactive Step Controller & Execution Stepper (Contribution 124) ---');

async function testPauseAndResume() {
  const broadcaster = new TelemetryBroadcaster();
  const controller = new StepController({
    runId: 'run_step_01',
    totalSteps: 5,
    broadcaster,
  });

  assert.equal(controller.getState(), 'running');

  // Trigger pause
  controller.pause();
  assert.equal(controller.getState(), 'paused');

  let executed = false;
  // Start step execution in background — it should block on barrier!
  const stepPromise = (async () => {
    await controller.beforeStep(1, 'click');
    executed = true;
    await controller.afterStep(1, 'click', { success: true, durationMs: 20 });
  })();

  // Give microtasks a turn: executed must remain false because it is paused
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(executed, false, 'Execution must block while paused');

  // Resume execution
  controller.resume();
  await stepPromise;
  assert.equal(executed, true, 'Execution must complete after resuming');
  assert.equal(controller.getState(), 'running');
  console.log('[PASS] Manual pause blocks step execution and resume unblocks seamlessly.');
}

async function testSingleStepForward() {
  const broadcaster = new TelemetryBroadcaster();
  const controller = new StepController({
    runId: 'run_step_02',
    broadcaster,
  });

  controller.pause();
  assert.equal(controller.getState(), 'paused');

  let step1Done = false;
  let step2Done = false;

  // Launch two steps sequentially
  const pipeline = (async () => {
    await controller.beforeStep(1, 'navigate');
    step1Done = true;
    await controller.afterStep(1, 'navigate', { success: true });

    await controller.beforeStep(2, 'click');
    step2Done = true;
    await controller.afterStep(2, 'click', { success: true });
  })();

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(step1Done, false);

  // Issue single step command
  controller.stepNext();
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(step1Done, true, 'Step 1 should execute after stepNext()');
  assert.equal(step2Done, false, 'Step 2 must NOT execute; controller must re-pause after 1 step');
  assert.equal(controller.getState(), 'paused');

  // Issue second step command
  controller.stepNext();
  await pipeline;
  assert.equal(step2Done, true);
  console.log('[PASS] stepNext() advances exactly 1 step before automatically re-arming pause barrier.');
}

async function testBreakpointTriggerPause() {
  const bpManager = new BreakpointManager();
  bpManager.addBreakpoint({
    stepIndex: 2,
    condition: 'always',
    enabled: true,
  });

  const controller = new StepController({
    runId: 'run_step_03',
    breakpointManager: bpManager,
  });

  // Step 1 runs without pause
  await controller.beforeStep(1, 'navigate');
  await controller.afterStep(1, 'navigate', { success: true });
  assert.equal(controller.getState(), 'running');

  // Step 2 hits breakpoint!
  let step2Reached = false;
  const step2Promise = (async () => {
    await controller.beforeStep(2, 'click');
    step2Reached = true;
    await controller.afterStep(2, 'click', { success: true });
  })();

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(step2Reached, false);
  assert.equal(controller.getState(), 'breakpoint_hit');

  controller.resume();
  await step2Promise;
  assert.equal(step2Reached, true);
  console.log('[PASS] Breakpoint manager triggers breakpoint_hit state and halts step until resumed.');
}

async function runSuite() {
  await testPauseAndResume();
  await testSingleStepForward();
  await testBreakpointTriggerPause();
  console.log('\nAll Contribution 124 tests passed cleanly!');
}

runSuite();
