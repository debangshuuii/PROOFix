/**
 * PR Self-Healing Review Comment Synthesizer (Contribution 196)
 *
 * Synthesizes intelligent pull request review comments with automated
 * code patch diffs and 1-click self-healing PR links.
 */

import type { PrReviewComment } from '../types/git-integrations.ts';

export interface HealingCommentParams {
  pullRequestNumber: number;
  commitSha: string;
  repoFullName: string;
  testTitle: string;
  filePath: string;
  brokenSelector?: string;
  suggestedSelector?: string;
  originalSnippet?: string;
  healedSnippet?: string;
  explanation: string;
  healingConfidence: number; // 0.0 - 1.0
  verificationPassed: boolean;
  appBaseUrl?: string;
}

export class PrCommentSynthesizer {
  /**
   * Generates a unified diff representation for the code changes.
   */
  public formatUnifiedDiff(
    filePath: string,
    original: string,
    healed: string
  ): string {
    const origLines = original.split('\n');
    const healedLines = healed.split('\n');

    let diff = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${origLines.length} +1,${healedLines.length} @@\n`;
    for (const line of origLines) {
      diff += `-${line}\n`;
    }
    for (const line of healedLines) {
      diff += `+${line}\n`;
    }
    return diff.trimEnd();
  }

  /**
   * Generates a secure 1-click self-healing URL or dispatch trigger.
   */
  public generate1ClickHealUrl(
    baseUrl: string,
    repoFullName: string,
    prNumber: number,
    commitSha: string,
    testTitle: string
  ): string {
    const params = new URLSearchParams({
      repo: repoFullName,
      pr: prNumber.toString(),
      sha: commitSha.substring(0, 12),
      action: 'apply_healing_patch',
      suite: encodeURIComponent(testTitle),
    });
    return `${baseUrl}/integrations/git/heal?${params.toString()}`;
  }

  /**
   * Synthesizes the complete review comment body and metadata.
   */
  public synthesizeComment(params: HealingCommentParams): PrReviewComment {
    const baseUrl = params.appBaseUrl || 'https://proofix.dev';
    const confidencePct = Math.round(params.healingConfidence * 100);

    let patchDiff: string | undefined;
    if (params.originalSnippet && params.healedSnippet) {
      patchDiff = this.formatUnifiedDiff(
        params.filePath,
        params.originalSnippet,
        params.healedSnippet
      );
    }

    const healUrl = this.generate1ClickHealUrl(
      baseUrl,
      params.repoFullName,
      params.pullRequestNumber,
      params.commitSha,
      params.testTitle
    );

    let body = `### 🛡️ PROOFix Autonomous Healing Inspector\n\n`;

    if (params.verificationPassed) {
      body += `> **Status:** 🟢 **Verification Passed** — No regressions or selector drifts detected.\n`;
      body += `> All automated visual and functional assertions completed successfully.\n`;
    } else {
      body += `> **Status:** 🔴 **Test Failure Detected** in \`${params.testTitle}\`\n`;
      body += `> **Self-Healing Confidence:** \`${confidencePct}%\`\n\n`;
      body += `#### 🔍 Root Cause Analysis\n`;
      body += `${params.explanation}\n\n`;

      if (params.brokenSelector && params.suggestedSelector) {
        body += `| Attribute | Previous (Broken) | AI-Resolved (Self-Healed) |\n`;
        body += `| :--- | :--- | :--- |\n`;
        body += `| **Selector** | \`${params.brokenSelector}\` | \`${params.suggestedSelector}\` |\n\n`;
      }

      if (patchDiff) {
        body += `#### 📝 Proposed Self-Healing Code Patch\n`;
        body += `\`\`\`diff\n${patchDiff}\n\`\`\`\n\n`;
      }

      body += `#### ⚡ Apply Resolution\n`;
      body += `Click below to let PROOFix commit this self-healing patch directly to this PR branch:\n\n`;
      body += `👉 **[⚡ 1-Click Apply Self-Healing Patch](${healUrl})**\n\n`;
      body += `_Or comment \`/proofix heal\` on this PR to automatically apply and re-verify._\n`;
    }

    return {
      pullRequestNumber: params.pullRequestNumber,
      commitSha: params.commitSha,
      body,
      patchDiff,
      selfHealingPrUrl: healUrl,
      verificationPassed: params.verificationPassed,
    };
  }
}

export const globalPrCommentSynthesizer = new PrCommentSynthesizer();
