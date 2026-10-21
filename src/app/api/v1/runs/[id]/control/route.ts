import { NextRequest, NextResponse } from 'next/server';
import { globalCompanionSessionManager } from '@/lib/companion/companion-session-manager';
import type { CompanionControlAction } from '@/lib/types/live-companion';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const action = body.action as CompanionControlAction;
    const actionParams = body.params || {};

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field "action"' },
        { status: 400 }
      );
    }

    const result = globalCompanionSessionManager.executeAction(id, action, actionParams);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to execute control action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      runId: id,
      action,
      state: result.state,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal error executing control action: ${err.message}` },
      { status: 500 }
    );
  }
}
