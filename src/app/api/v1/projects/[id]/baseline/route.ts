import { NextRequest, NextResponse } from 'next/server';
import {
  setProjectBaseline,
  replaceProjectBaseline,
  getActiveProjectBaseline,
  getProjectBaselineHistory,
} from '@/lib/comparison/baseline-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const active = await getActiveProjectBaseline(projectId);
    const history = await getProjectBaselineHistory(projectId);

    return NextResponse.json({
      projectId,
      activeBaseline: active,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { runId, setBy, reason, action } = body;

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    if (action === 'replace') {
      const result = await replaceProjectBaseline(projectId, runId, { setBy, reason });
      const history = await getProjectBaselineHistory(projectId);
      return NextResponse.json({
        success: true,
        previous: result.previous,
        activeBaseline: result.current,
        history,
      });
    }

    const baseline = await setProjectBaseline(projectId, runId, { setBy, reason });
    const history = await getProjectBaselineHistory(projectId);

    return NextResponse.json({
      success: true,
      activeBaseline: baseline,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
