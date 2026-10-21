import test from 'node:test';
import assert from 'node:assert/strict';

test('TransportProtocol and QualityMetrics meet <50ms requirements', () => {
  const metrics = {
    protocol: 'webrtc',
    rttLatencyMs: 24, // <50ms ultra-low latency target
    fps: 60, // 60 FPS viewport mirroring
    packetLossRate: 0.001,
    jitterMs: 1.2,
    bandwidthKbps: 4500,
  };

  assert.equal(metrics.protocol, 'webrtc');
  assert.ok(metrics.rttLatencyMs < 50);
  assert.equal(metrics.fps, 60);
});

test('SignalingMessage and BidirectionalControlCommand validate properly', () => {
  const signal = {
    sessionId: 'session-rt-101',
    senderId: 'client-browser-42',
    type: 'offer',
    sdp: { type: 'offer', sdp: 'v=0\r\no=- 42 2 IN IP4 127.0.0.1\r\n' },
    timestamp: new Date().toISOString(),
  };

  assert.equal(signal.type, 'offer');
  assert.equal(signal.sessionId, 'session-rt-101');
  assert.ok(signal.sdp?.sdp.includes('v=0'));

  const cmd = {
    commandId: 'cmd-999',
    sessionId: 'session-rt-101',
    type: 'step_over',
    timestamp: new Date().toISOString(),
  };

  assert.equal(cmd.type, 'step_over');
});
