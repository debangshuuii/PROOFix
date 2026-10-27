import { StickyCommentOptions, StickyCommentResult } from './action-types';
import { wrapWithStickyMarker } from './sticky-comment-marker';
import { createOrUpdateStickyComment } from './github-comment-client';
import { formatVisualDiffDetailsMarkdown } from './visual-diff-formatter';
import { formatFailureVideoSectionMarkdown } from './video-step-linker';
import { formatAutoFixSectionMarkdown } from './autofix-dispatch-generator';

/**
 * Builds the complete GitHub Markdown body for the rich sticky PR comment.
 */
export function buildStickyPrCommentMarkdown(options: StickyCommentOptions): string {
  const {
    commitSha,
    runId,
    status,
    summary,
    hydrationDrifts,
    brokenRoutes,
    visualDiffs,
    videoSteps,
    autoFix,
    proofBadgeMarkdown,
    proofFingerprint,
    proofPreviewUrl,
  } = options;

  const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  const statusHeadline = status === 'passed'
    ? 'All Verification Journeys Passed (100% Evidence)'
    : status === 'failed'
    ? `${summary.failed} Verification Defect${summary.failed > 1 ? 's' : ''} Detected`
    : 'Execution Error Encounted';

  // Section 1: Header & Key Metrics
  const headerSection = `
### 🛡️ PROOFix Verification Report: ${statusEmoji} ${statusHeadline}

${proofBadgeMarkdown}

| Metric | Result |
| :--- | :--- |
| **Commit** | \`${commitSha.slice(0, 7)}\` |
| **Execution Run ID** | \`${runId}\` |
| **Total Checks** | **${summary.total}** checks |
| **Pass Rate** | **${summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%** (${summary.passed} passed, ${summary.failed} failed) |
| **Execution Duration** | **${(summary.durationMs / 1000).toFixed(1)}s** |
| **Proof Fingerprint** | \`${proofFingerprint.slice(0, 16)}...\` |
`.trim();

  // Section 2: React 19 Hydration Drift Gate Warnings
  let hydrationSection = '';
  if (hydrationDrifts && hydrationDrifts.length > 0) {
    const rows = hydrationDrifts.map((h, i) => {
      const comp = h.component ? `\`<${h.component}>\`` : '<em>Root</em>';
      const detail = h.serverValue && h.clientValue
        ? `<br/><code>Server: ${h.serverValue}</code> vs <code>Client: ${h.clientValue}</code>`
        : '';
      return `| #${i + 1} | \`${h.route}\` | ${comp} | ${h.errorMessage}${detail} |`;
    }).join('\n');

    hydrationSection = `
<details open>
<summary><b>🚨 React 19 SSR Hydration Drift Gate Violations (#418) - BLOCKS MERGE</b></summary>

| # | Route | Component | Error & Divergence |
| :-: | :--- | :--- | :--- |
${rows}

> ⚠️ **Gatekeeper Enforced:** React 19 Hydration mismatch #418 detected. Server-rendered HTML drifted from client initial render.
</details>
`.trim();
  }

  // Section 3: Dead link 404 Navigation Failures
  let brokenRoutesSection = '';
  if (brokenRoutes && brokenRoutes.length > 0) {
    const rows = brokenRoutes.map((b, i) => {
      const referer = b.referringPage ? `\`${b.referringPage}\`` : '<em>Direct Navigation</em>';
      return `| #${i + 1} | \`${b.route}\` | **HTTP 404 Not Found** | ${referer} |`;
    }).join('\n');

    brokenRoutesSection = `
<details open>
<summary><b>🔗 Dead Navigation Routes & 404 Auditing - BLOCKS MERGE</b></summary>

| # | Target Route | Status Code | Linked From |
| :-: | :--- | :---: | :--- |
${rows}

> ⚠️ **Gatekeeper Enforced:** 404 Not Found encountered during automated journey crawl.
</details>
`.trim();
  }

  // Section 4: Visual Regression Details
  const visualSection = formatVisualDiffDetailsMarkdown(visualDiffs, proofPreviewUrl);

  // Section 5: Failure Video Linker
  const videoSection = formatFailureVideoSectionMarkdown(videoSteps);

  // Section 6: Auto-Fix Section
  const autoFixSection = formatAutoFixSectionMarkdown(autoFix);

  // Assemble full comment
  const content = [
    headerSection,
    hydrationSection,
    brokenRoutesSection,
    visualSection,
    videoSection,
    autoFixSection,
    '\n---\n*Verified with mathematical Playwright Chromium evidence by [PROOFix](https://github.com/debangshuuii/PROOFix).*',
  ]
    .filter(Boolean)
    .join('\n\n');

  return wrapWithStickyMarker(content, runId);
}

/**
 * Publishes or updates the sticky PR comment using the GitHub REST API.
 */
export async function publishStickyPrComment(options: StickyCommentOptions): Promise<StickyCommentResult> {
  const bodyMarkdown = buildStickyPrCommentMarkdown(options);

  if (!options.githubToken) {
    return {
      action: 'skipped',
      bodyMarkdown,
    };
  }

  const result = await createOrUpdateStickyComment({
    owner: options.repoOwner,
    repo: options.repoName,
    issueNumber: options.prNumber,
    token: options.githubToken,
    body: bodyMarkdown,
    sticky: true,
  });

  return {
    action: result.action,
    commentId: result.commentId,
    commentUrl: result.commentUrl,
    bodyMarkdown,
  };
}
