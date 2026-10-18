import { NextRequest, NextResponse } from 'next/server';
import { cancelExecutionRun } from '@/lib/execution/runner';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cancelled = await cancelExecutionRun(id);
    return NextResponse.json({ success: cancelled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
