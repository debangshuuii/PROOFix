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
