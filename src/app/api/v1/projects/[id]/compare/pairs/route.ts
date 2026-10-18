import { NextRequest, NextResponse } from 'next/server';
import { queryScreenshots, indexExistingArtifacts } from '@/lib/comparison/screenshot-indexer';
import { getActiveProjectBaseline } from '@/lib/comparison/baseline-manager';
import { matchScreenshotPairs } from '@/lib/comparison/pair-matcher';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);

    let baseRunId = searchParams.get('baseRunId');
    const targetRunId = searchParams.get('targetRunId');

    // If no baseRunId is explicitly supplied, use active project baseline
    if (!baseRunId) {
      const activeBaseline = await getActiveProjectBaseline(projectId);
      if (activeBaseline) {
        baseRunId = activeBaseline.runId;
      }
    }

    if (!baseRunId || !targetRunId) {
      return NextResponse.json(
        { error: 'Both baseRunId and targetRunId are required to match screenshot pairs.' },
        { status: 400 }
      );
    }

    // Ensure artifacts are indexed
    await indexExistingArtifacts({ projectId });

    const baselineScreenshots = await queryScreenshots({
      projectId,
      runId: baseRunId,
    });

    const targetScreenshots = await queryScreenshots({
      projectId,
      runId: targetRunId,
    });

    const result = matchScreenshotPairs(baselineScreenshots, targetScreenshots);

    return NextResponse.json({
      projectId,
      baseRunId,
      targetRunId,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
