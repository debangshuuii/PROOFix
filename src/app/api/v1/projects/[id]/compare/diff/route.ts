import { NextRequest, NextResponse } from 'next/server';
import { generateDiffForPair } from '@/lib/comparison/diff-engine';
import { queryScreenshots } from '@/lib/comparison/screenshot-indexer';
import { matchScreenshotPairs } from '@/lib/comparison/pair-matcher';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const { pairId, baseRunId, targetRunId, threshold, includeAA, maskedRegions } = body;

    let pair = body.pair;

    if (!pair && pairId && baseRunId && targetRunId) {
      const baselineScreenshots = await queryScreenshots({ projectId, runId: baseRunId });
      const targetScreenshots = await queryScreenshots({ projectId, runId: targetRunId });
      const matched = matchScreenshotPairs(baselineScreenshots, targetScreenshots);
      pair = matched.allPairs.find((p) => p.id === pairId);
    }

    if (!pair) {
      return NextResponse.json({ error: 'Screenshot pair not found or invalid' }, { status: 400 });
    }

    const diffResult = await generateDiffForPair(pair, {
      threshold,
      includeAA,
      maskedRegions,
    });

    return NextResponse.json({
      success: true,
      diffResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
