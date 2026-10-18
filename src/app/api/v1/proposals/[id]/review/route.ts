import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FixProposal } from '@/lib/types/proposal';

// In-memory proposal registry (persisted or associated with findings)
export const proposalsRegistry = new Map<string, FixProposal>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposal = proposalsRegistry.get(id);

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body;

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Field "action" must be either "approve" or "reject".' },
        { status: 400 }
      );
    }

    let proposal = proposalsRegistry.get(id);

    // If not in transient registry, generate initial baseline proposal from finding
    if (!proposal) {
      proposal = {
        id,
        projectId: 'proj_fixture_01',
        runId: 'run_fixture_baseline',
        failureId: id,
        commitSha: 'a1b2c3d4e5f6',
        explanation: reason || 'Defensive fix addressing discovered test failure and route drop-off.',
        proposedChanges: `--- a/src/fixtures/sample-app/src/app/page.tsx
+++ b/src/fixtures/sample-app/src/app/page.tsx
@@ -38,1 +38,1 @@
-          <Link href="/broken-route" style={{ color: '#f87171' }}>Broken Link (404)</Link>
+          <Link href="/about" style={{ color: '#38bdf8' }}>About</Link>`,
        affectedFiles: ['src/fixtures/sample-app/src/app/page.tsx'],
        confidenceScore: 95,
        validationStatus: 'valid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (action === 'reject') {
      proposal.validationStatus = 'rejected';
      proposal.updatedAt = new Date().toISOString();
      proposalsRegistry.set(id, proposal);

      return NextResponse.json({
        success: true,
        message: 'Patch proposal rejected. Repository files remain unmodified.',
        proposal,
      });
    }

    // action === 'approve'
    proposal.validationStatus = 'valid'; // ready to be applied in isolation
    proposal.updatedAt = new Date().toISOString();
    proposalsRegistry.set(id, proposal);

    return NextResponse.json({
      success: true,
      message: 'Patch proposal approved. Ready for isolated execution.',
      proposal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
