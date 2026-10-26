/**
 * Automated Verification Suite for Linear/Vercel-Grade UI Polish,
 * Live Interactive Canvas Stream, and Time-Travel Scrubber.
 */

import assert from 'node:assert';
import { SoundSynthesizer } from '../src/lib/sound/sound-synthesizer.ts';
import { KeyboardShortcutsManager } from '../src/lib/shortcuts/keyboard-shortcuts.ts';
import { TimeTravelEngine } from '../src/lib/timetravel/timetravel-engine.ts';

console.log('====================================================');
console.log('  PROOFix Interactive Canvas & Time-Travel CI Suite');
console.log('====================================================');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Sound Synthesizer Tests
runTest('Sound Synthesizer: Initializes and toggles mute state correctly', () => {
  const synth = new SoundSynthesizer({ muted: false, masterVolume: 0.4 });
  assert.strictEqual(synth.getMuted(), false);

  const isMuted = synth.toggleMute();
  assert.strictEqual(isMuted, true);
  assert.strictEqual(synth.getMuted(), true);

  const isUnmuted = synth.toggleMute();
  assert.strictEqual(isUnmuted, false);
});

runTest('Sound Synthesizer: Safe invocation in non-browser Node environments', () => {
  const synth = new SoundSynthesizer();
  // In Node environment, AudioContext is gracefully undefined; functions should execute without throwing
  assert.doesNotThrow(() => synth.playSuccessChime());
  assert.doesNotThrow(() => synth.playFailureChime());
  assert.doesNotThrow(() => synth.playSelfHealChime());
  assert.doesNotThrow(() => synth.playClickTick());
});

// 2. Keyboard Shortcuts Tests
runTest('Keyboard Shortcuts: Handler registration and dispatch', () => {
  const manager = new KeyboardShortcutsManager();
  const received = [];

  const unregister = manager.register((action) => {
    received.push(action);
  });

  // Access private dispatch via reflection for headless CI verification
  manager['dispatch']('rerun_verification', { key: 'Enter' });
  manager['dispatch']('toggle_diff', { key: 'd' });
  manager['dispatch']('toggle_playback', { code: 'Space' });
  manager['dispatch']('step_forward', { key: 'ArrowRight' });

  assert.deepStrictEqual(received, [
    'rerun_verification',
    'toggle_diff',
    'toggle_playback',
    'step_forward',
  ]);

  unregister();
  manager['dispatch']('toggle_audio', { key: 'm' });
  // Should not receive any more actions after unregister
  assert.strictEqual(received.length, 4);
});

// 3. Time-Travel Scrubber Engine Tests
runTest('Time-Travel Engine: Initial offset 0ms returns initialization frame', () => {
  const engine = new TimeTravelEngine();
  const state = engine.getStateAtOffset(0);

  assert.strictEqual(state.currentFrame.offsetMs, 0);
  assert.strictEqual(state.currentFrame.stepId, 'step_init');
  assert.strictEqual(state.progress, 0);
  assert.ok(state.activeLogs.length > 0);
});

runTest('Time-Travel Engine: Midpoint offset 1850ms returns user interaction click frame', () => {
  const engine = new TimeTravelEngine();
  const state = engine.getStateAtOffset(1850);

  assert.strictEqual(state.currentFrame.stepId, 'step_click');
  assert.strictEqual(state.currentFrame.activeSelector, 'button#checkout');
  assert.deepStrictEqual(state.currentFrame.clickCoordinates, { x: 480, y: 320 });
  assert.ok(state.progress > 0.4 && state.progress < 0.6);
});

runTest('Time-Travel Engine: Error offset 2750ms reflects HTTP 404 failure and accumulated logs', () => {
  const engine = new TimeTravelEngine();
  const state = engine.getStateAtOffset(2750);

  assert.strictEqual(state.currentFrame.stepId, 'step_checkout_fail');
  assert.strictEqual(state.currentFrame.status, 'failed');

  const errorNet = state.activeNetwork.find((n) => n.status === 404);
  assert.ok(errorNet, 'Expected HTTP 404 network request in waterfall');
  assert.strictEqual(errorNet.url, 'http://localhost:3000/api/checkout');

  const errorLog = state.activeLogs.find((l) => l.level === 'error');
  assert.ok(errorLog, 'Expected error log in console streams');
});

runTest('Time-Travel Engine: Healed offset 3850ms returns zero-regression confirmed state', () => {
  const engine = new TimeTravelEngine();
  const state = engine.getStateAtOffset(3850);

  assert.strictEqual(state.currentFrame.stepId, 'step_healed');
  assert.strictEqual(state.currentFrame.status, 'passed');
  assert.ok(state.currentFrame.domSnapshot.includes('Order #ORD_9918 Confirmed'));
});

runTest('Time-Travel Engine: Bounds checking for negative and overflow offsets', () => {
  const engine = new TimeTravelEngine();
  const negativeState = engine.getStateAtOffset(-500);
  assert.strictEqual(negativeState.progress, 0);

  const overflowState = engine.getStateAtOffset(999999);
  assert.strictEqual(overflowState.progress, 1);
  assert.strictEqual(overflowState.currentFrame.stepId, 'step_healed');
});

console.log('====================================================');
console.log(`  All ${passedTests} Interactive Canvas & Scrubber CI Checks Passed!`);
console.log('====================================================');
