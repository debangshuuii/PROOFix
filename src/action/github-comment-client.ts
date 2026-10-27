import { isProofixStickyComment } from './sticky-comment-marker';

export interface GitHubApiOptions {
  owner: string;
  repo: string;
  issueNumber: number;
  token?: string;
}

export interface ExistingComment {
  id: number;
  body: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Finds an existing PROOFix sticky comment on a pull request using GitHub REST API.
 */
export async function findExistingStickyComment(
  options: GitHubApiOptions
): Promise<ExistingComment | null> {
  const { owner, repo, issueNumber, token } = options;

  if (!token) {
    return null;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=50`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'PROOFix-GitHub-Action',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`[PROOFix GitHub Client] Failed listing comments: HTTP ${res.status}`);
      return null;
    }

    const comments = (await res.json()) as Array<{
      id: number;
      body?: string;
      html_url?: string;
      created_at?: string;
      updated_at?: string;
    }>;

    for (const comment of comments) {
      if (comment.body && isProofixStickyComment(comment.body)) {
        return {
          id: comment.id,
          body: comment.body,
          htmlUrl: comment.html_url || '',
          createdAt: comment.created_at || '',
          updatedAt: comment.updated_at || '',
        };
      }
    }

    return null;
  } catch (err: any) {
    console.warn(`[PROOFix GitHub Client] Error searching for sticky comment: ${err.message}`);
    return null;
  }
}

/**
 * Creates or updates a sticky PR comment in-place.
 */
export async function createOrUpdateStickyComment(
  options: GitHubApiOptions & { body: string; sticky?: boolean }
): Promise<{
  action: 'created' | 'updated' | 'skipped';
  commentId?: number;
  commentUrl?: string;
  error?: string;
}> {
  const { owner, repo, issueNumber, token, body, sticky = true } = options;

  if (!token) {
    return { action: 'skipped', error: 'Missing GitHub token' };
  }

  try {
    let existing: ExistingComment | null = null;
    if (sticky) {
      existing = await findExistingStickyComment({ owner, repo, issueNumber, token });
    }

    if (existing) {
      // Update existing comment in place
      const updateUrl = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existing.id}`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'PROOFix-GitHub-Action',
        },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        throw new Error(`PATCH comment failed with HTTP ${res.status}`);
      }

      const updated = (await res.json()) as { id: number; html_url?: string };
      return {
        action: 'updated',
        commentId: updated.id,
        commentUrl: updated.html_url || existing.htmlUrl,
      };
    } else {
      // Create new comment
      const createUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'PROOFix-GitHub-Action',
        },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        throw new Error(`POST comment failed with HTTP ${res.status}`);
      }

      const created = (await res.json()) as { id: number; html_url?: string };
      return {
        action: 'created',
        commentId: created.id,
        commentUrl: created.html_url,
      };
    }
  } catch (err: any) {
    console.error(`[PROOFix GitHub Client] Failed publishing sticky PR comment: ${err.message}`);
    return { action: 'skipped', error: err.message };
  }
}

export interface CheckRunOptions {
  owner: string;
  repo: string;
  commitSha: string;
  token?: string;
  name: string;
  conclusion: 'success' | 'failure' | 'neutral';
  title: string;
  summary: string;
  annotations?: Array<{
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: 'failure' | 'warning' | 'notice';
    message: string;
    title: string;
  }>;
}

/**
 * Creates a GitHub Check Run with annotations to block pull request merges on failure.
 */
export async function createOrUpdateCheckRun(
  options: CheckRunOptions
): Promise<{ checkRunId?: number; htmlUrl?: string; error?: string }> {
  const { owner, repo, commitSha, token, name, conclusion, title, summary, annotations = [] } = options;

  if (!token) {
    return { error: 'Missing GitHub token for Check Run API' };
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/check-runs`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'PROOFix-GitHub-Action',
      },
      body: JSON.stringify({
        name,
        head_sha: commitSha,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
          title,
          summary,
          annotations: annotations.slice(0, 50), // GitHub limits to 50 per batch
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Check Run API failed (HTTP ${res.status}): ${errText}` };
    }

    const json = (await res.json()) as { id: number; html_url?: string };
    return {
      checkRunId: json.id,
      htmlUrl: json.html_url,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
