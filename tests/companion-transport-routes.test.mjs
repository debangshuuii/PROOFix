import test from 'node:test';
import assert from 'node:assert/strict';
import { globalWebRtcSignalingBroker } from '../src/lib/companion/webrtc-signaling-broker.ts';
import { globalAdaptiveTransportRouter } from '../src/lib/companion/adaptive-transport-router.ts';

test('Transport negotiation returns WebRTC protocol with fallback config', () => {
  const protocol = globalAdaptiveTransportRouter.negotiateTransport('webrtc');
  assert.equal(protocol, 'webrtc');

  const config = globalWebRtcSignalingBroker.getRtcConfig();
  assert.ok(config.iceServers.length > 0);
});

test('Signaling broker accepts offer and returns registered message', () => {
  const sessId = 'test-route-session';
  const offer = {
    type: 'offer',
    sdp: 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n',
  };

  const msg = globalWebRtcSignalingBroker.registerOffer(sessId, offer);
  assert.equal(msg.sessionId, sessId);
  assert.equal(msg.type, 'offer');

  globalWebRtcSignalingBroker.addIceCandidate(sessId, {
    candidate: 'candidate:dummy',
  });

  const candidates = globalWebRtcSignalingBroker.getIceCandidates(sessId);
  assert.equal(candidates.length, 1);
});
