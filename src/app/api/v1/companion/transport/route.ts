import { NextRequest, NextResponse } from 'next/server';
import { globalAdaptiveTransportRouter } from '@/lib/companion/adaptive-transport-router';
import { globalWebSocketSessionManager } from '@/lib/companion/websocket-session-manager';
import { DEFAULT_RTC_CONFIG } from '@/lib/companion/webrtc-signaling-broker';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preferred = searchParams.get('protocol') as any;

  const protocol = globalAdaptiveTransportRouter.negotiateTransport(preferred);

  return NextResponse.json({
    status: 'ready',
    activeProtocol: protocol,
    fallbackOrder: ['webrtc', 'websocket', 'sse'],
    webrtc: {
      iceServers: DEFAULT_RTC_CONFIG.iceServers,
      dataChannel: 'webrtc-datachannel',
    },
    websocket: {
      endpoint: '/api/v1/companion/ws',
      heartbeatIntervalMs: 15000,
    },
    sse: {
      endpoint: '/api/v1/companion/stream',
    },
    activeSessions: globalWebSocketSessionManager.getActiveSessionCount(),
    targetFps: 60,
    targetLatencyMs: '<50ms',
    timestamp: new Date().toISOString(),
  });
}
