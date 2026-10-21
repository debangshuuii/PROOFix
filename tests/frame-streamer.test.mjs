import assert from 'node:assert/strict';
import { FrameStreamer } from '../src/lib/companion/frame-streamer.ts';
import { TelemetryBroadcaster } from '../src/lib/companion/telemetry-broadcaster.ts';

console.log('--- Testing Viewport Frame Streamer & Deduplication Engine (Contribution 125) ---');

function testFrameEncodingAndBroadcast() {
  const broadcaster = new TelemetryBroadcaster();
  const streamer = new FrameStreamer({ targetFps: 30, broadcaster });

  const runId = 'run_frame_01';
  const receivedEvents = [];
  broadcaster.subscribe(runId, (chunk) => {
    receivedEvents.push(chunk);
  });

  const dummyFrame = Buffer.from('fake-frame-pixels-1');
  const payload = streamer.pushFrame(runId, dummyFrame, { width: 1280, height: 720 });

  assert.ok(payload);
  assert.equal(payload.frameIndex, 1);
  assert.equal(payload.width, 1280);
  assert.equal(payload.height, 720);
  assert.equal(payload.isKeyframe, true);
  assert.ok(payload.dataUrl.startsWith('data:image/jpeg;base64,'));
  assert.equal(receivedEvents.length, 1);
  console.log('[PASS] Frame streamer encodes JPEG base64 payload and broadcasts keyframe.');
}

async function testFpsThrottling() {
  const broadcaster = new TelemetryBroadcaster();
  // Target 5 FPS -> minimum interval 200ms
  const streamer = new FrameStreamer({ targetFps: 5, broadcaster });
  const runId = 'run_frame_throttle';

  const buf1 = Buffer.from('frame-1');
  const buf2 = Buffer.from('frame-2');

  const p1 = streamer.pushFrame(runId, buf1, { width: 800, height: 600 });
  assert.ok(p1, 'First frame must be accepted');

  // Push immediate second frame (0ms elapsed): must be dropped by FPS throttle!
  const p2 = streamer.pushFrame(runId, buf2, { width: 800, height: 600 });
  assert.equal(p2, null, 'Second frame within 200ms window must be throttled');

  // Wait 220ms and push third frame: must be accepted!
  await new Promise((r) => setTimeout(r, 220));
  const p3 = streamer.pushFrame(runId, buf2, { width: 800, height: 600 });
  assert.ok(p3, 'Frame after throttle window expires must be accepted');

  const stats = streamer.getStats();
  assert.equal(stats.totalFramesIngested, 3);
  assert.equal(stats.fpsThrottledFramesDropped, 1);
  assert.equal(stats.framesBroadcasted, 2);
  console.log('[PASS] Rate limiter accurately throttles frames exceeding target FPS.');
}

async function testDeduplication() {
  const broadcaster = new TelemetryBroadcaster();
  const streamer = new FrameStreamer({ targetFps: 60, keyframeInterval: 10, broadcaster });
  const runId = 'run_frame_dedup';

  const identicalBuf = Buffer.from('static-unchanged-screen');

  // Frame 1: Keyframe 1 -> accepted
  const p1 = streamer.pushFrame(runId, identicalBuf, { width: 800, height: 600 });
  assert.ok(p1);

  await new Promise((r) => setTimeout(r, 25));

  // Frame 2: Identical buffer -> dropped as duplicate!
  const p2 = streamer.pushFrame(runId, identicalBuf, { width: 800, height: 600 });
  assert.equal(p2, null);

  const stats = streamer.getStats();
  assert.equal(stats.duplicateFramesDropped, 1);
  console.log('[PASS] Frame hash deduplication drops identical static frames.');
}

async function runSuite() {
  testFrameEncodingAndBroadcast();
  await testFpsThrottling();
  await testDeduplication();
  console.log('\nAll Contribution 125 tests passed cleanly!');
}

runSuite();
