import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { proposalsRegistry } from '../review/route';
import { createGitHubPullRequest } from '@/lib/github/pr-creator';

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

    const tokenHeader = req.headers.get('x-github-token');
    const settings = await db.getSettings();
    const token = tokenHeader || settings.githubToken;

    const project = await db.getProjectById(proposal.projectId);
    const repoUrl = project?.repoUrl || 'https://github.com/debangshuuii/PROOFix';

    const result = await createGitHubPullRequest({
      proposal,
      repoUrl,
      token,
      isMock: process.env.NODE_ENV === 'test' || !token,
    });

    if (!result.success) {
      const status = result.error?.includes('Unauthorized')
        ? 401
        : result.error?.includes('Insufficient')
        ? 403
        : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    proposal.gitBranch = result.branchName;
    proposal.pullRequestUrl = result.pullRequestUrl;
    proposal.updatedAt = new Date().toISOString();
    proposalsRegistry.set(id, proposal);

    return NextResponse.json({
      success: true,
      branchName: result.branchName,
      pullRequestUrl: result.pullRequestUrl,
      pullRequestNumber: result.pullRequestNumber,
      proposal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
