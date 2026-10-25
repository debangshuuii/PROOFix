import { NextResponse } from 'next/server';
import { DualPassOrchestrator } from '@/lib/prover/dual-pass-orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await DualPassOrchestrator.executeProof({
      scenarioId: body.scenarioId || 'ecommerce_checkout',
      patchDiff: body.patchDiff,
      workspacePath: body.workspacePath,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Prover execution error', status: 'ERROR' },
      { status: 500 }
    );
  }
}
