import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await db.getRunById(id);
    if (!run) {
      return NextResponse.json({ error: 'Verification run not found' }, { status: 404 });
    }

    const testResults = await db.getTestResults(id);
    const findings = await db.getFindings(id);
    const project = await db.getProjectById(run.projectId);

    return NextResponse.json({
      run,
      project,
      testResults,
      findings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
