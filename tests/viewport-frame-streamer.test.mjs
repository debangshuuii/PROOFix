import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ViewportFrameStreamer,
  globalViewportFrameStreamer,
} from '../src/lib/companion/viewport-frame-streamer.ts';

test('packFrame generates sequential packets at 60 FPS', () => {
  const streamer = new ViewportFrameStreamer(10);
  const fakePixelData1 = 'data:image/webp;base64,AAAA1111';
  const fakePixelData2 = 'data:image/webp;base64,BBBB2222';

  const packet1 = streamer.packFrame(fakePixelData1, 1280, 720);
  assert.ok(packet1);
  assert.equal(packet1.sequenceNumber, 1);
  assert.equal(packet1.width, 1280);
  assert.equal(packet1.height, 720);
  assert.equal(packet1.frameRateFps, 60);
  assert.equal(packet1.isKeyframe, true);

  const packet2 = streamer.packFrame(fakePixelData2, 1280, 720);
  assert.ok(packet2);
  assert.equal(packet2.sequenceNumber, 2);
  assert.equal(packet2.isKeyframe, false);
});

test('packFrame skips redundant static frames to save bandwidth', () => {
  const streamer = new ViewportFrameStreamer(60);
  const staticData = 'data:image/webp;base64,STATIC_FRAME_DATA';

  const first = streamer.packFrame(staticData, 1920, 1080, { forceKeyframe: true });
  assert.ok(first);

  // Identical frame should be skipped as redundant delta
  const second = streamer.packFrame(staticData, 1920, 1080);
  assert.equal(second, null);

  const stats = streamer.getStreamingStats();
  assert.equal(stats.skippedDeltas, 1);
});
