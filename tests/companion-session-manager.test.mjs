import assert from 'node:assert/strict';
import {
  CompanionSessionManager,
  globalCompanionSessionManager,
} from '../src/lib/companion/companion-session-manager.ts';
import { TelemetryBroadcaster } from '../src/lib/companion/telemetry-broadcaster.ts';
import { FrameStreamer } from '../src/lib/companion/frame-streamer.ts';

console.log('--- Testing Companion Session Manager & Lifecycle (Contribution 127) ---');

function testSessionCreationAndRetrieval() {
  const broadcaster = new TelemetryBroadcaster();
  const streamer = new FrameStreamer({ broadcaster });
  const manager = new CompanionSessionManager(broadcaster, streamer);

  const runId = 'run_mgr_01';
  const context = manager.createSession(runId, 6, 15);

  assert.equal(context.session.runId, runId);
  assert.equal(context.session.totalSteps, 6);
  assert.equal(context.session.fps, 15);
  assert.equal(context.session.state, 'running');

  const retrieved = manager.getContext(runId);
  assert.ok(retrieved);
  assert.equal(retrieved.session.id, context.session.id);
  console.log('[PASS] Companion session initialization creates and wires controllers.');
}

function testExecuteControlActions() {
  const broadcaster = new TelemetryBroadcaster();
  const manager = new CompanionSessionManager(broadcaster);
  const runId = 'run_mgr_control';

  manager.createSession(runId, 4);

  // 1. Pause
  const pauseRes = manager.executeAction(runId, 'pause');
  assert.equal(pauseRes.success, true);
  assert.equal(pauseRes.state, 'paused');

  // 2. Set Breakpoint
  const bpRes = manager.executeAction(runId, 'set_breakpoint', {
    stepIndex: 3,
    condition: 'always',
  });
  assert.equal(bpRes.success, true);
  const ctx = manager.getContext(runId);
  assert.equal(ctx.session.breakpoints.length, 1);
  assert.equal(ctx.session.breakpoints[0].stepIndex, 3);

  // 3. Resume
  const resumeRes = manager.executeAction(runId, 'resume');
  assert.equal(resumeRes.success, true);
  assert.equal(resumeRes.state, 'running');

  // 4. Step Next
  manager.executeAction(runId, 'pause');
  const stepRes = manager.executeAction(runId, 'step_next');
  assert.equal(stepRes.success, true);
  assert.equal(stepRes.state, 'stepping');

  console.log('[PASS] Action dispatcher routes pause, resume, step, and breakpoint commands.');
}

function testSessionTermination() {
  const manager = new CompanionSessionManager();
  const runId = 'run_mgr_term';
  manager.createSession(runId, 5);

  assert.equal(manager.listActiveSessions().length, 1);

  manager.terminateSession(runId, true);
  assert.equal(manager.getContext(runId), undefined);
  assert.equal(manager.listActiveSessions().length, 0);
  console.log('[PASS] Session termination cleans up active contexts and streamers.');
}

testSessionCreationAndRetrieval();
testExecuteControlActions();
testSessionTermination();
console.log('\nAll Contribution 127 tests passed cleanly!');
