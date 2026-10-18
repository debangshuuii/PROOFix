import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    const body = await req.json();
    const { repoUrl, branch } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    // Clean repository URL and trim .git suffix
    const cleanUrl = repoUrl.trim().replace(/\.git\/?$/, '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json(
        {
          error: 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repository',
          hint: 'Ensure URL points to a valid GitHub repository without query parameters or invalid path segments.',
        },
        { status: 400 }
      );
    }

    const owner = match[1];
    const repo = match[2];

    const settings = await db.getSettings();
    const headers: Record<string, string> = {
      'User-Agent': 'PROOFix-Verification-Platform/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (settings.githubToken) {
      headers['Authorization'] = `token ${settings.githubToken}`;
    }

    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (!ghRes.ok) {
      let errorMessage = 'Failed accessing GitHub repository.';
      let hint = 'Check the repository URL or configure credentials.';

      if (ghRes.status === 404) {
        errorMessage = `Repository "${owner}/${repo}" was not found or is private.`;
        hint = 'If this is a private repository, configure a GitHub Personal Access Token in Settings with "repo" scope.';
      } else if (ghRes.status === 401) {
        errorMessage = 'GitHub token is invalid or expired.';
        hint = 'Update your GitHub Personal Access Token in Settings.';
      } else if (ghRes.status === 403) {
        const rateLimitRemaining = ghRes.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          errorMessage = 'GitHub API rate limit exceeded for unauthenticated requests.';
          hint = 'Add a GitHub Personal Access Token in Settings to receive 5,000 requests/hour.';
        } else {
          errorMessage = 'GitHub access forbidden for the current token scope.';
        }
      }

      return NextResponse.json({ error: errorMessage, hint, statusCode: ghRes.status }, { status: ghRes.status });
    }

    const ghData = await ghRes.json();
    const targetBranch = branch || ghData.default_branch || 'main';

    // Fetch latest commit hash
    let commitHash = 'main-head';
    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${targetBranch}`,
        { headers }
      );
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        commitHash = commitData.sha ? commitData.sha.substring(0, 7) : 'main-head';
      }
    } catch {}

    const updated = await db.updateProject(id, {
      name: project.name || ghData.name,
      description: project.description || ghData.description || '',
      repoUrl: ghData.html_url,
      repoProvider: 'github',
      defaultBranch: targetBranch,
    });

    return NextResponse.json({
      success: true,
      repository: {
        fullName: ghData.full_name,
        branch: targetBranch,
        commitHash,
        isPrivate: ghData.private,
        stars: ghData.stargazers_count,
        language: ghData.language,
      },
      project: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
