import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdaptiveTransportRouter,
  globalAdaptiveTransportRouter,
} from '../src/lib/companion/adaptive-transport-router.ts';

test('negotiateTransport selects WebRTC by default when supported', () => {
  const router = new AdaptiveTransportRouter();
  const negotiated = router.negotiateTransport(undefined, {
    supportsWebRtc: true,
    supportsWebSocket: true,
  });

  assert.equal(negotiated, 'webrtc');
  assert.equal(router.getCurrentProtocol(), 'webrtc');
});

test('negotiateTransport falls back to WebSocket when WebRTC is disabled', () => {
  const router = new AdaptiveTransportRouter();
  const negotiated = router.negotiateTransport(undefined, {
    supportsWebRtc: false,
    supportsWebSocket: true,
  });

  assert.equal(negotiated, 'websocket');
});

test('reportQualityMetrics degrades from WebRTC to WebSocket on high latency or packet loss', () => {
  const router = new AdaptiveTransportRouter('webrtc');

  // Good metrics keep WebRTC
  const good = router.reportQualityMetrics({
    protocol: 'webrtc',
    rttLatencyMs: 25,
    fps: 60,
    packetLossRate: 0.001,
    jitterMs: 1.0,
    bandwidthKbps: 5000,
  });
  assert.equal(good.degraded, false);
  assert.equal(good.protocol, 'webrtc');

  // Degraded metrics (>80ms RTT) trigger fallback
  const degraded = router.reportQualityMetrics({
    protocol: 'webrtc',
    rttLatencyMs: 110,
    fps: 40,
    packetLossRate: 0.08,
    jitterMs: 12.0,
    bandwidthKbps: 1200,
  });
  assert.equal(degraded.degraded, true);
  assert.equal(degraded.protocol, 'websocket');
  assert.equal(router.getCurrentProtocol(), 'websocket');
});
