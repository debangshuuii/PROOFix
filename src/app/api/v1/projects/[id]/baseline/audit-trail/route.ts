import { NextRequest, NextResponse } from 'next/server';
import { getBaselineAuditTrail } from '@/lib/comparison/baseline-approval';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const auditData = await getBaselineAuditTrail(projectId);

    return NextResponse.json({
      projectId,
      ...auditData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
