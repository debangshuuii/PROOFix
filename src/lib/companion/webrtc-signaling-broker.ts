/**
 * WebRTC Peer Connection & SDP / ICE Signaling Broker (Contribution 233)
 *
 * Brokers peer-to-peer WebRTC DataChannels for ultra-low latency (<30ms)
 * bidirectional control commands and 60 FPS canvas viewport mirroring.
 */

import type {
  SignalingMessage,
  RtcSessionDescriptionPayload,
  RtcIceCandidatePayload,
} from '../types/live-transport.ts';

export interface RtcConfiguration {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceTransportPolicy?: 'all' | 'relay';
}

export const DEFAULT_RTC_CONFIG: RtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
};

export class WebRtcSignalingBroker {
  private offers: Map<string, RtcSessionDescriptionPayload> = new Map();
  private answers: Map<string, RtcSessionDescriptionPayload> = new Map();
  private iceCandidates: Map<string, RtcIceCandidatePayload[]> = new Map();

  /**
   * Generates or validates an SDP offer for a companion session.
   */
  public registerOffer(sessionId: string, offer: RtcSessionDescriptionPayload): SignalingMessage {
    if (offer.type !== 'offer' || !offer.sdp.includes('v=0')) {
      throw new Error('Invalid SDP offer payload: must contain valid SDP version line v=0');
    }

    this.offers.set(sessionId, offer);
    return {
      sessionId,
      senderId: 'host-runner',
      type: 'offer',
      sdp: offer,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generates or registers an SDP answer responding to an offer.
   */
  public registerAnswer(sessionId: string, answer: RtcSessionDescriptionPayload): SignalingMessage {
    if (answer.type !== 'answer' || !answer.sdp.includes('v=0')) {
      throw new Error('Invalid SDP answer payload: must contain valid SDP version line v=0');
    }

    this.answers.set(sessionId, answer);
    return {
      sessionId,
      senderId: 'remote-viewer',
      type: 'answer',
      sdp: answer,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Records a trickle ICE candidate for a session.
   */
  public addIceCandidate(sessionId: string, candidate: RtcIceCandidatePayload): void {
    if (!candidate || !candidate.candidate) {
      return;
    }
    const list = this.iceCandidates.get(sessionId) || [];
    list.push(candidate);
    this.iceCandidates.set(sessionId, list);
  }

  /**
   * Retrieves all gathered ICE candidates for session negotiation.
   */
  public getIceCandidates(sessionId: string): RtcIceCandidatePayload[] {
    return [...(this.iceCandidates.get(sessionId) || [])];
  }

  /**
   * Returns current active WebRTC configuration (STUN/TURN).
   */
  public getRtcConfig(): RtcConfiguration {
    return { ...DEFAULT_RTC_CONFIG };
  }

  public clearSession(sessionId: string): void {
    this.offers.delete(sessionId);
    this.answers.delete(sessionId);
    this.iceCandidates.delete(sessionId);
  }
}

export const globalWebRtcSignalingBroker = new WebRtcSignalingBroker();
