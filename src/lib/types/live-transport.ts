/**
 * WebRTC / WebSocket Ultra-Low Latency Live Companion Transport Types (Contribution 231)
 *
 * Defines protocol schemas, signaling messages, 60 FPS viewport frame packets,
 * and bidirectional step-debugging commands for <50ms real-time mirroring.
 */

export type TransportProtocol = 'webrtc' | 'websocket' | 'sse';

export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'join_session'
  | 'leave_session'
  | 'session_ready';

export interface RtcSessionDescriptionPayload {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface RtcIceCandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface SignalingMessage {
  sessionId: string;
  senderId: string;
  type: SignalingMessageType;
  sdp?: RtcSessionDescriptionPayload;
  candidate?: RtcIceCandidatePayload;
  timestamp: string;
}

export interface ViewportFramePacket {
  sequenceNumber: number;
  timestampNano: bigint | number;
  width: number;
  height: number;
  frameRateFps: number;
  mimeType: 'image/jpeg' | 'image/webp' | 'application/octet-stream';
  isKeyframe: boolean;
  base64Data?: string;
  byteLength: number;
}

export type DebuggerCommandType =
  | 'pause'
  | 'resume'
  | 'step_over'
  | 'step_into'
  | 'step_out'
  | 'inspect_selector'
  | 'inject_mouse_click'
  | 'inject_key_press';

export interface BidirectionalControlCommand {
  commandId: string;
  sessionId: string;
  type: DebuggerCommandType;
  coordinates?: { x: number; y: number };
  selector?: string;
  key?: string;
  timestamp: string;
}

export interface TransportQualityMetrics {
  protocol: TransportProtocol;
  rttLatencyMs: number; // Round-trip time (<50ms target)
  fps: number; // Target 60 FPS
  packetLossRate: number; // 0.0 to 1.0
  jitterMs: number;
  bandwidthKbps: number;
}
