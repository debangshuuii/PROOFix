import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { executeVerificationRun } from '@/lib/execution/runner';
import { VerificationRun } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get('x-github-event');
    const signature = req.headers.get('x-hub-signature-256');
    const rawBody = await req.text();

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify HMAC signature if secret is configured
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return NextResponse.json({ error: 'Invalid HMAC webhook signature.' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    // Ping event verification
    if (event === 'ping') {
      return NextResponse.json({
        message: 'PROOFix GitHub Webhook configured successfully.',
        zen: payload.zen,
      });
    }

    // Handle issue_comment events for /proofix slash commands
    if (event === 'issue_comment') {
      const { globalSlashCommandParser } = await import('@/lib/integrations/slash-command-parser');
      const { globalCommentCommandHandler } = await import('@/lib/integrations/comment-command-handler');

      const commentBody = payload.comment?.body || '';
      if (!globalSlashCommandParser.isSlashCommand(commentBody)) {
        return NextResponse.json({ message: 'Ignored non-command comment.' });
      }

      const parsed = globalSlashCommandParser.parseComment(commentBody, {
        author: payload.comment?.user?.login,
        commentId: payload.comment?.id,
        pullRequestNumber: payload.issue?.number,
      });

      const repoName = payload.repository?.full_name || 'unknown/repo';
      const prNumber = payload.issue?.number || 0;
      const headSha = payload.comment?.commit_id || payload.issue?.pull_request?.sha || 'head';

      const result = await globalCommentCommandHandler.handleCommand(parsed, {
        repoFullName: repoName,
        pullRequestNumber: prNumber,
        branchName: payload.issue?.pull_request?.head?.ref || 'main',
        headSha,
      });

      return NextResponse.json({
        success: result.success,
        command: result.command,
        message: result.message,
        replyCommentBody: result.replyCommentBody,
      });
    }

    if (event !== 'push' && event !== 'pull_request') {
      return NextResponse.json({ message: `Ignored unhandled GitHub event: ${event}` });
    }

    const repoFullName = payload.repository?.full_name?.toLowerCase();
    const repoHtmlUrl = payload.repository?.html_url?.toLowerCase();

    // Match against registered projects
    const projects = await db.getProjects();
    const matchedProject = projects.find((p) => {
      if (!p.repoUrl) return false;
      const lower = p.repoUrl.toLowerCase();
      return (repoFullName && lower.includes(repoFullName)) || (repoHtmlUrl && lower === repoHtmlUrl);
    });

    if (!matchedProject) {
      return NextResponse.json({
        message: `No active project configured matching repository "${payload.repository?.full_name}".`,
      });
    }

    const commitHash =
      event === 'push'
        ? payload.after?.substring(0, 8) || 'head'
        : payload.pull_request?.head?.sha?.substring(0, 8) || 'head';

    const branch =
      event === 'push'
        ? payload.ref?.replace('refs/heads/', '') || matchedProject.defaultBranch
        : payload.pull_request?.head?.ref || matchedProject.defaultBranch;

    const existingRuns = await db.getRuns(matchedProject.id);
    const runNumber = existingRuns.length + 1;
    const runId = `run_gh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRun: VerificationRun = {
      id: runId,
      projectId: matchedProject.id,
      projectVersionId: `ver_gh_${commitHash}`,
      runNumber,
      status: 'pending',
      buildStatus: 'pending',
      startupStatus: 'pending',
      startedAt: new Date().toISOString(),
      commitHash,
      branch,
      executionConfig: {
        isolationMode: 'local_process_sandbox',
        port: matchedProject.config.port || 4173,
        timeoutMs: (matchedProject.config.timeoutSecs || 45) * 1000,
      },
      isolationDisclaimer: 'Local Process Sandbox triggered by GitHub Webhook.',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        inconclusive: 0,
      },
      logs: [
        `[GitHub Webhook Received] Event: ${event} | Ref: ${branch} | Commit: ${commitHash}`,
        `[PROOFix] Triggering automated verification run #${runNumber}...`,
      ],
      createdAt: new Date().toISOString(),
    };

    const saved = await db.createRun(newRun);

    // Asynchronously trigger execution
    setTimeout(() => {
      executeVerificationRun(runId).catch((err) => {
        console.error('Webhook execution run failed:', err);
      });
    }, 100);

    return NextResponse.json({
      success: true,
      message: `Triggered PROOFix verification run #${runNumber} for commit ${commitHash}.`,
      run: saved,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
