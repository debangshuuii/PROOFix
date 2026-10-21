import { NextRequest, NextResponse } from 'next/server';
import { globalChaosMonkeyCrawler } from '@/lib/crawler/chaos-monkey-crawler';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  // Return a recent report
  const report = await globalChaosMonkeyCrawler.runAutonomousSession({
    seedUrl: 'https://demo.proofix.dev',
    maxPages: 3,
  });

  return NextResponse.json({
    status: 'active',
    sessionId: sessionId || report.sessionId,
    report,
    capabilities: {
      randomPayloadFuzzing: true,
      anomalySentinel: true,
      stateGraphVisualization: true,
    },
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const seedUrl = body.seedUrl || 'https://demo.proofix.dev';
    const maxPages = typeof body.maxPages === 'number' ? body.maxPages : 4;
    const maxDepth = typeof body.maxDepth === 'number' ? body.maxDepth : 3;
    const randomPayloadsEnabled = body.randomPayloadsEnabled !== false;

    const report = await globalChaosMonkeyCrawler.runAutonomousSession({
      seedUrl,
      maxPages,
      maxDepth,
      randomPayloadsEnabled,
    });

    return NextResponse.json(
      {
        status: 'accepted',
        sessionId: report.sessionId,
        seedUrl: report.seedUrl,
        totalNodesExplored: report.totalNodesExplored,
        totalActionsExecuted: report.totalActionsExecuted,
        anomaliesCount: report.anomalies.length,
        anomalies: report.anomalies,
        report,
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to initiate chaos crawler session', message: err?.message },
      { status: 500 }
    );
  }
}
