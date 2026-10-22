import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/db';
import { proposalsRegistry } from '../review/route';
import { createDisposableWorkspace } from '@/lib/repair/workspace-isolation';
import { applyPatchWithJournal } from '@/lib/repair/atomic-patch-applier';
import { PatchSyntaxValidator } from '@/lib/repair/patch-syntax-validator';
import { SecurityPatchGuard } from '@/lib/repair/security-patch-guard';

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

    // AST and Security Pre-check
    const primaryFile = proposal.affectedFiles[0] || 'page.tsx';
    const syntaxReport = PatchSyntaxValidator.validate(proposal.proposedChanges, primaryFile);
    if (!syntaxReport.valid) {
      return NextResponse.json(
        {
          error: `Patch contains syntax errors: ${syntaxReport.errors.map((e: { message: string }) => e.message).join('; ')}`,
        },
        { status: 422 }
      );
    }

    const secCheck = SecurityPatchGuard.scanPatch(proposal.proposedChanges, proposal.affectedFiles);
    if (!secCheck.allowed) {
      return NextResponse.json(
        {
          error: `Patch contains prohibited security patterns: ${secCheck.violations.map((v: { message: string }) => v.message).join('; ')}`,
        },
        { status: 403 }
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

    // 3. Apply patch inside isolated workspace with transaction journal
    const applyResult = await applyPatchWithJournal({
      workspacePath: disposableWorkspace,
      diffText: diff,
      proposalId: id,
    });

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
      message: 'Patch applied successfully in disposable workspace with transaction journal.',
      proposal,
      modifiedFiles: applyResult.modifiedFiles,
      transactionId: applyResult.transactionId,
      workspacePath: disposableWorkspace,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
