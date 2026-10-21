import { NextRequest, NextResponse } from 'next/server';
import { globalWebRtcSignalingBroker } from '@/lib/companion/webrtc-signaling-broker';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing required sessionId query parameter' }, { status: 400 });
  }

  const candidates = globalWebRtcSignalingBroker.getIceCandidates(sessionId);
  return NextResponse.json({
    sessionId,
    candidatesCount: candidates.length,
    candidates,
    rtcConfig: globalWebRtcSignalingBroker.getRtcConfig(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, type, sdp, candidate } = body;

    if (!sessionId || !type) {
      return NextResponse.json({ error: 'Missing sessionId or signal type' }, { status: 400 });
    }

    if (type === 'offer' && sdp) {
      const msg = globalWebRtcSignalingBroker.registerOffer(sessionId, sdp);
      return NextResponse.json({ status: 'registered', signal: msg }, { status: 200 });
    }

    if (type === 'answer' && sdp) {
      const msg = globalWebRtcSignalingBroker.registerAnswer(sessionId, sdp);
      return NextResponse.json({ status: 'registered', signal: msg }, { status: 200 });
    }

    if (type === 'ice_candidate' && candidate) {
      globalWebRtcSignalingBroker.addIceCandidate(sessionId, candidate);
      return NextResponse.json({ status: 'candidate_added', sessionId }, { status: 200 });
    }

    return NextResponse.json({ error: `Unrecognized signaling message type: ${type}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to process signaling message', message: err?.message }, { status: 500 });
  }
}
