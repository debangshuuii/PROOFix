import { NextRequest, NextResponse } from 'next/server';
import { proposalsRegistry } from '../review/route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let proposal = proposalsRegistry.get(id);

    // Fallback proposal if not in transient memory
    if (!proposal) {
      proposal = {
        id,
        projectId: 'proj_fixture_01',
        runId: 'run_fixture_baseline',
        failureId: id,
        commitSha: 'a1b2c3d4e5f6',
        explanation: 'Fix broken navigation link href pointing to missing route /broken-route',
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

    const patchHeader = [
      `From: PROOFix AI Self-Repair Engine <engine@proofix.dev>`,
      `Date: ${new Date(proposal.createdAt).toUTCString()}`,
      `Subject: [PATCH] PROOFix Fix for ${proposal.failureId}: ${proposal.explanation}`,
      `Commit-SHA: ${proposal.commitSha}`,
      `Confidence: ${proposal.confidenceScore}%`,
      ``,
      `${proposal.explanation}`,
      ``,
      `---`,
      ``,
    ].join('\n');

    const fullPatchText = `${patchHeader}${proposal.proposedChanges}\n\n--\nPROOFix v1.0.0 — Automated Application Verification Platform\n`;

    return new NextResponse(fullPatchText, {
      headers: {
        'Content-Type': 'text/x-diff; charset=utf-8',
        'Content-Disposition': `attachment; filename="proofix-${id}.patch"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
