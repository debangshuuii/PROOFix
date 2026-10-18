import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeVerificationRun } from '@/lib/execution/runner';
import { VerificationRun } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const previousRun = await db.getRunById(id);
    if (!previousRun) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const testResults = await db.getTestResults(id);
    const failedTests = testResults.filter((t) => t.status === 'failed');

    if (failedTests.length === 0) {
      return NextResponse.json(
        { error: 'Previous run had zero failing tests to rerun.' },
        { status: 400 }
      );
    }

    const project = await db.getProjectById(previousRun.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const existingRuns = await db.getRuns(project.id);
    const runNumber = existingRuns.length + 1;
    const newRunId = `run_rerun_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRun: VerificationRun = {
      id: newRunId,
      projectId: project.id,
      projectVersionId: previousRun.projectVersionId,
      runNumber,
      status: 'pending',
      buildStatus: 'pending',
      startupStatus: 'pending',
      startedAt: new Date().toISOString(),
      commitHash: previousRun.commitHash,
      branch: previousRun.branch,
      executionConfig: {
        ...previousRun.executionConfig,
      },
      isolationDisclaimer: previousRun.isolationDisclaimer,
      summary: {
        total: failedTests.length,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        inconclusive: 0,
      },
      logs: [
        `[PROOFix Rerun Initiated] Rerunning ${failedTests.length} previously failing check(s)...`,
        ...failedTests.map((t) => `  - Targeting check: "${t.name}"`),
      ],
      createdAt: new Date().toISOString(),
    };

    const saved = await db.createRun(newRun);

    // Asynchronously trigger execution
    setTimeout(() => {
      executeVerificationRun(newRunId).catch((err) => {
        console.error('Rerun execution error:', err);
      });
    }, 100);

    return NextResponse.json({
      success: true,
      message: `Triggered regression rerun for ${failedTests.length} failing check(s).`,
      run: saved,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
