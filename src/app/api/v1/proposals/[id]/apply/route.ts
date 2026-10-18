import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { proposalsRegistry } from '../review/route';
import { createDisposableWorkspace, applyPatchToWorkspace } from '@/lib/repair/workspace-isolation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let proposal = proposalsRegistry.get(id);

    if (!proposal) {
      // Default to sample fixture proposal
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
      proposalsRegistry.set(id, proposal);
    }

    if (proposal.validationStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot apply a rejected proposal. Re-approve before applying.' },
        { status: 400 }
      );
    }

    const project = await db.getProjectById(proposal.projectId);
    const sourceDir = project?.localPath
      ? path.resolve(process.cwd(), project.localPath)
      : path.resolve(process.cwd(), 'src/fixtures/sample-app');

    // 1. Provision isolated disposable workspace
    const disposableWorkspace = await createDisposableWorkspace(sourceDir, id);

    // 2. Adjust diff paths relative to workspace root if needed
    let diff = proposal.proposedChanges;
    if (diff.includes('src/fixtures/sample-app/')) {
      diff = diff.replace(/src\/fixtures\/sample-app\//g, '');
    }

    // 3. Apply patch inside isolated workspace
    const applyResult = await applyPatchToWorkspace(disposableWorkspace, diff);

    if (!applyResult.success) {
      return NextResponse.json(
        { error: applyResult.error || 'Patch application failed.' },
        { status: 422 }
      );
    }

    proposal.validationStatus = 'applied';
    proposal.appliedWorkspacePath = disposableWorkspace;
    proposal.updatedAt = new Date().toISOString();
    proposalsRegistry.set(id, proposal);

    return NextResponse.json({
      success: true,
      message: 'Patch applied successfully in disposable workspace.',
      proposal,
      modifiedFiles: applyResult.modifiedFiles,
      workspacePath: disposableWorkspace,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
