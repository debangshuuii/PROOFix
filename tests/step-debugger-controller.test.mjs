import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StepDebuggerController,
  globalStepDebuggerController,
} from '../src/lib/companion/step-debugger-controller.ts';

test('StepDebuggerController handles pause and resume transitions', async () => {
  const controller = new StepDebuggerController();
  assert.equal(controller.isPaused(), false);

  const pauseAck = await controller.handleCommand({
    commandId: 'cmd-pause-1',
    sessionId: 'sess-1',
    type: 'pause',
    timestamp: new Date().toISOString(),
  });

  assert.equal(pauseAck.acknowledged, true);
  assert.equal(controller.isPaused(), true);

  const resumeAck = await controller.handleCommand({
    commandId: 'cmd-resume-1',
    sessionId: 'sess-1',
    type: 'resume',
    timestamp: new Date().toISOString(),
  });

  assert.equal(resumeAck.acknowledged, true);
  assert.equal(controller.isPaused(), false);
});

test('StepDebuggerController evaluates breakpoints accurately', () => {
  const controller = new StepDebuggerController();
  controller.setBreakpoint('step-3');

  assert.equal(controller.shouldBreak('step-3'), true);
  assert.equal(controller.shouldBreak('step-1'), false);

  controller.removeBreakpoint('step-3');
  assert.equal(controller.shouldBreak('step-3'), false);
});

test('StepDebuggerController tracks step_over index progression', async () => {
  const controller = new StepDebuggerController();
  assert.equal(controller.getDebuggerState().currentStepIndex, 0);

  await controller.handleCommand({
    commandId: 'cmd-step-1',
    sessionId: 'sess-1',
    type: 'step_over',
    timestamp: new Date().toISOString(),
  });

  assert.equal(controller.getDebuggerState().currentStepIndex, 1);
});
