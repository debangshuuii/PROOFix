import { NextRequest, NextResponse } from 'next/server';
import { proposalsRegistry } from '../review/route';
import { cleanupDisposableWorkspace } from '@/lib/repair/workspace-isolation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let proposal = proposalsRegistry.get(id);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.appliedWorkspacePath) {
      await cleanupDisposableWorkspace(proposal.appliedWorkspacePath);
      proposal.appliedWorkspacePath = undefined;
    }

    proposal.validationStatus = 'reverted';
    proposal.verificationOutcome = undefined;
    proposal.updatedAt = new Date().toISOString();
    proposalsRegistry.set(id, proposal);

    return NextResponse.json({
      success: true,
      message: 'Patch rolled back. Disposable workspace was purged; original repository remains unchanged.',
      proposal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
