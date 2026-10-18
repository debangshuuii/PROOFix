import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeVerificationRun } from '@/lib/execution/runner';
import { VerificationRun } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runs = await db.getRuns(id);
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const versions = await db.getProjectVersions(id);
    const latestVersion = versions[0] || {
      id: `ver_auto_${Date.now()}`,
      commitHash: 'head',
    };

    const existingRuns = await db.getRuns(id);
    const runNumber = existingRuns.length + 1;
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRun: VerificationRun = {
      id: runId,
      projectId: id,
      projectVersionId: latestVersion.id,
      runNumber,
      status: 'pending',
      buildStatus: 'pending',
      startupStatus: 'pending',
      startedAt: new Date().toISOString(),
      commitHash: latestVersion.commitHash || 'head',
      branch: project.defaultBranch || 'main',
      executionConfig: {
        isolationMode: 'local_process_sandbox',
        port: project.config.port || 4173,
        timeoutMs: (project.config.timeoutSecs || 45) * 1000,
      },
      isolationDisclaimer:
        'Local Process Sandbox: Process isolation with secret sanitization and allocated port. Container cgroup isolation requires Docker daemon.',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        inconclusive: 0,
      },
      logs: [`[PROOFix Initialized] Queueing verification run #${runNumber}...`],
      createdAt: new Date().toISOString(),
    };

    const saved = await db.createRun(newRun);

    // Asynchronously trigger execution in background
    setTimeout(() => {
      executeVerificationRun(runId).catch((err) => {
        console.error('Run execution error:', err);
      });
    }, 100);

    return NextResponse.json({ run: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
