import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareRuns } from '@/lib/comparison/regressions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const baseRunId = searchParams.get('baseRunId');
    const targetRunId = searchParams.get('targetRunId');

    const runs = await db.getRuns(id);
    if (runs.length < 2 && (!baseRunId || !targetRunId)) {
      return NextResponse.json(
        { error: 'At least two runs are required for comparison.' },
        { status: 400 }
      );
    }

    const runA = baseRunId ? runs.find((r) => r.id === baseRunId) : runs[1];
    const runB = targetRunId ? runs.find((r) => r.id === targetRunId) : runs[0];

    if (!runA || !runB) {
      return NextResponse.json({ error: 'Specified runs not found' }, { status: 404 });
    }

    const resultsA = await db.getTestResults(runA.id);
    const resultsB = await db.getTestResults(runB.id);

    const comparison = compareRuns(runA, runB, resultsA, resultsB);

    return NextResponse.json({
      comparison,
      baseRun: runA,
      targetRun: runB,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
