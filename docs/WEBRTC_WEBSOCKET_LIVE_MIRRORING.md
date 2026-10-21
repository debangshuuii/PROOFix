# 🪞 WebRTC / WebSocket Transport for Live Companion Mirroring

## Overview
PROOFix provides ultra-low latency (<50ms) bidirectional control and 60 FPS viewport mirroring during live interactive step-debugging. It features an adaptive multi-tier transport architecture with seamless fallback:

```
                            ┌─────────────────────────────────────────┐
                            │        AdaptiveTransportRouter          │
                            └────────────────────┬────────────────────┘
                                                 │
                          Tiered Latency Protocol Negotiation
                                                 │
                ┌────────────────────────────────┼────────────────────────────────┐
                ▼                                ▼                                ▼
     ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
     │  WebRTC DataChannel  │         │ WebSocket (TCP bi-di)│         │ Server-Sent Events   │
     │      (<30ms RTT)     │         │      (<60ms RTT)     │         │    (SSE Fallback)    │
     │  P2P 60 FPS Viewport │         │  Framed Socket Relay │         │  HTTP Chunked Stream │
     └──────────┬───────────┘         └──────────┬───────────┘         └──────────┬───────────┘
                │                                │                                │
                └────────────────────────────────┼────────────────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │     StepDebuggerController (<50ms)      │
                            │ (Pause, Resume, Step Over, Click-Inject)│
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │     ViewportFrameStreamer (60 FPS)      │
                            │   (Keyframe cadence & Delta Dedupe)     │
                            └─────────────────────────────────────────┘
```

## Features Implemented (Contributions 231–240)

1. **Ultra-Low Latency Transport Schemas (`src/lib/types/live-transport.ts`)**:
   - `TransportProtocol`, `SignalingMessage`, `RtcSessionDescriptionPayload`, `RtcIceCandidatePayload`, `ViewportFramePacket`, `BidirectionalControlCommand`, `TransportQualityMetrics`.

2. **WebSocket Bidirectional Session Manager (`src/lib/companion/websocket-session-manager.ts`)**:
   - Client rooms, host/viewer connection tracking, and instant bi-directional command dispatching.

3. **WebRTC Signaling Broker (`src/lib/companion/webrtc-signaling-broker.ts`)**:
   - SDP Offer/Answer lifecycle, trickle ICE candidate aggregation, and Google STUN server configuration.

4. **60 FPS Viewport Video Frame Streamer (`src/lib/companion/viewport-frame-streamer.ts`)**:
   - Sub-16ms frame packetization, periodic keyframe synchronization (1/sec), and SHA-256 delta compression to reduce bandwidth during static steps.

5. **Bidirectional Step-Debugger Controller (`src/lib/companion/step-debugger-controller.ts`)**:
   - Interactive breakpoint management, pause/resume execution locks, and synthetic click/keystroke injection.

6. **Adaptive Protocol Fallback Router (`src/lib/companion/adaptive-transport-router.ts`)**:
   - Dynamic failover benchmark: WebRTC (<30ms) -> WebSocket (<60ms) -> SSE (~150ms).

7. **Live Companion REST & Signaling Route Handlers (`src/app/api/v1/companion/*`)**:
   - `/api/v1/companion/transport`: Protocol negotiation and configuration.
   - `/api/v1/companion/webrtc/signal`: SDP and ICE candidate broker.

8. **Realtime Companion Mirroring Canvas UI (`src/components/companion/RealtimeCompanionMirror.tsx`)**:
   - 60 FPS canvas mirror, real-time latency HUD (<50ms green pulse), interactive step debugger controls (`Pause`, `Resume`, `Step Over`), and click-to-inject canvas events.

9. **Live Companion Route & Enterprise Hub Navigation (`src/app/companion/mirror/page.tsx`)**:
   - Dedicated App Router page wired directly into `portal-registry.ts` and Navbar portal navigation.

10. **Automated CI Suite**:
    - `npm run test:transport` (`tests/verify-live-transport-ci.mjs`).
