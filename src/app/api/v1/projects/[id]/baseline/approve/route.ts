import { NextRequest, NextResponse } from 'next/server';
import { approveRunAsBaseline } from '@/lib/comparison/baseline-approval';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const { runId, approverName, approverEmail, comment } = body;

    if (!runId || !approverName) {
      return NextResponse.json(
        { error: 'runId and approverName are required to approve a baseline.' },
        { status: 400 }
      );
    }

    const result = await approveRunAsBaseline({
      projectId,
      runId,
      approverName,
      approverEmail,
      comment,
    });

    return NextResponse.json({
      success: true,
      message: `Run ${runId} successfully approved and set as active baseline.`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
