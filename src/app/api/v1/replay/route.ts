import { NextResponse } from 'next/server';
import { globalMockReplayService } from '@/lib/replay/mock-replay-service';
import { listCassettes } from '@/lib/replay/cassette-storage';
import { getAllAvailablePresets } from '@/lib/replay/provider-presets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (runId) {
    const session = globalMockReplayService.getSession(runId);
    if (session) {
      return NextResponse.json({ session });
    }
  }

  // Return available cassettes and presets
  const [cassettes, presets] = await Promise.all([
    listCassettes().catch(() => []),
    Promise.resolve(getAllAvailablePresets()),
  ]);

  return NextResponse.json({
    cassettes,
    presets,
    activeSessions: globalMockReplayService.listActiveSessions(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { runId, action, options, faultRule } = body;

    const targetRunId = runId || 'run_default_replay';

    if (action === 'start') {
      const session = await globalMockReplayService.startSession(targetRunId, {
        mode: options?.mode || 'replay',
        cassetteId: options?.cassetteId,
        matchStrategy: options?.matchStrategy || 'exact',
        faultRules: options?.faultRules,
      });
      return NextResponse.json({ success: true, session });
    }

    if (action === 'stop') {
      const stopped = await globalMockReplayService.stopSession(targetRunId);
      return NextResponse.json({ success: true, stopped });
    }

    if (action === 'add_fault' && faultRule) {
      const success = globalMockReplayService.addFaultRule(targetRunId, faultRule);
      return NextResponse.json({ success });
    }

    // Default: return current session or start auto session
    let session = globalMockReplayService.getSession(targetRunId);
    if (!session) {
      session = await globalMockReplayService.startSession(targetRunId, {
        mode: 'replay',
        cassetteId: 'stripe',
      });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Replay service error: ${err.message}` },
      { status: 500 }
    );
  }
}
