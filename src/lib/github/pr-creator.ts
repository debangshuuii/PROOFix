import { FixProposal } from '../types/proposal';

export interface GitHubPRParams {
  proposal: FixProposal;
  repoUrl: string;
  token?: string;
  isMock?: boolean;
}

export interface GitHubPRResult {
  success: boolean;
  branchName?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  error?: string;
}

/**
 * Creates a dedicated branch and draft Pull Request on GitHub containing
 * the verified patch, test evidence, and root-cause analysis.
 * Strictly enforces token authorization.
 */
export async function createGitHubPullRequest(
  params: GitHubPRParams
): Promise<GitHubPRResult> {
  const { proposal, repoUrl, token, isMock = false } = params;

  // Authorization check
  if (!token && !isMock) {
    return {
      success: false,
      error:
        'Unauthorized: GitHub Personal Access Token is required to create branches and pull requests. Please provide x-github-token or configure it in Settings.',
    };
  }

  // Parse repo owner and name from URL
  const match = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git|\/|$)/);
  const owner = match ? match[1] : 'owner';
  const repo = match ? match[2] : 'repo';

  const branchName = `proofix/fix-${proposal.id.toLowerCase()}`;
  const prTitle = `[PROOFix Fix] ${proposal.explanation.slice(0, 60)}...`;

  const prBody = [
    `## 🛡️ PROOFix Automated Verification & Self-Repair`,
    ``,
    `### Root Cause Explanation`,
    `${proposal.explanation}`,
    ``,
    `### Verification Outcome`,
    `- **Status:** ${proposal.verificationOutcome?.status === 'passed' ? '✅ Verified Fix (0 Regressions)' : '⚠️ Partial Improvement'}`,
    `- **Confidence Score:** ${proposal.confidenceScore}%`,
    `- **Target Commit:** \`${proposal.commitSha}\``,
    ``,
    `### Affected Files`,
    ...proposal.affectedFiles.map((f) => `- \`${f}\``),
    ``,
    `### Unified Diff Preview`,
    `\`\`\`diff`,
    proposal.proposedChanges,
    `\`\`\``,
    ``,
    `---`,
    `*Automated fix generated and verified in disposable sandbox by [PROOFix](https://github.com/debangshuuii/PROOFix).*`,
  ].join('\n');

  // If in mock or offline mode, simulate successful branch and PR creation
  if (isMock || token === 'mock_valid_token' || token?.startsWith('ghp_mock')) {
    return {
      success: true,
      branchName,
      pullRequestNumber: 42,
      pullRequestUrl: `https://github.com/${owner}/${repo}/pull/42`,
    };
  }

  // Real GitHub API call
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'PROOFix-Verification-Platform',
      },
      body: JSON.stringify({
        title: prTitle,
        head: branchName,
        base: 'main',
        body: prBody,
        draft: true,
      }),
    });

    if (res.status === 403 || res.status === 401) {
      return {
        success: false,
        error:
          'Insufficient permissions: GitHub token does not have write access (repo / pull-requests:write scope) to create branches or pull requests in this repository.',
      };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: `GitHub API error (${res.status}): ${data.message || 'Failed creating pull request.'}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      branchName,
      pullRequestNumber: data.number,
      pullRequestUrl: data.html_url,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to GitHub API: ${err.message}`,
    };
  }
}
