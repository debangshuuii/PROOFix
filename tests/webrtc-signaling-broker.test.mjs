import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WebRtcSignalingBroker,
  globalWebRtcSignalingBroker,
  DEFAULT_RTC_CONFIG,
} from '../src/lib/companion/webrtc-signaling-broker.ts';

test('WebRtcSignalingBroker registers SDP offer and answer', () => {
  const broker = new WebRtcSignalingBroker();
  const sessionId = 'rtc-sess-42';

  const offer = {
    type: 'offer',
    sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n',
  };

  const offerMsg = broker.registerOffer(sessionId, offer);
  assert.equal(offerMsg.type, 'offer');
  assert.equal(offerMsg.sessionId, sessionId);

  const answer = {
    type: 'answer',
    sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n',
  };

  const answerMsg = broker.registerAnswer(sessionId, answer);
  assert.equal(answerMsg.type, 'answer');
});

test('WebRtcSignalingBroker collects trickle ICE candidates', () => {
  const broker = new WebRtcSignalingBroker();
  const sessionId = 'rtc-sess-ice';

  broker.addIceCandidate(sessionId, {
    candidate: 'candidate:1 1 UDP 2130706431 192.168.1.50 54321 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
  });

  const candidates = broker.getIceCandidates(sessionId);
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].candidate.includes('192.168.1.50'));
});

test('DEFAULT_RTC_CONFIG provides Google STUN servers', () => {
  assert.ok(DEFAULT_RTC_CONFIG.iceServers.length >= 1);
  assert.ok(DEFAULT_RTC_CONFIG.iceServers[0].urls.toString().includes('stun.l.google.com'));
});
