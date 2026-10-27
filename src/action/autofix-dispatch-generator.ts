import { AutoFixDispatchLink } from './action-types';

export interface AutoFixLinkOptions {
  repoOwner: string;
  repoName: string;
  workflowFile?: string;
  branchName: string;
  prNumber?: number;
  runId?: string;
}

/**
 * Generates an automated GitHub workflow dispatch link to trigger the self-healing auto-fix workflow.
 */
export function generateAutoFixDispatchLink(options: AutoFixLinkOptions): AutoFixDispatchLink {
  const {
    repoOwner,
    repoName,
    workflowFile = 'proofix-autofix.yml',
    branchName,
    prNumber,
    runId,
  } = options;

  // GitHub Actions manual workflow dispatch page URL
  const dispatchUrl = `https://github.com/${repoOwner}/${repoName}/actions/workflows/${workflowFile}?ref=${encodeURIComponent(branchName)}`;

  const buttonMarkdown = [
    `[![Prove & Auto-Fix](https://img.shields.io/badge/PROOFix-Prove_%26_Auto--Fix-0284c7?style=for-the-badge&logo=github&logoColor=white)](${dispatchUrl})`,
    `\n> 🤖 **Automated Self-Repair:** Click the badge above to dispatch \`${workflowFile}\` on branch \`${branchName}\`. PROOFix will apply the verified fix and commit directly to this PR.`,
  ].join('\n');

  return {
    workflowName: workflowFile,
    dispatchUrl,
    branchName,
    prNumber,
    buttonMarkdown,
  };
}
