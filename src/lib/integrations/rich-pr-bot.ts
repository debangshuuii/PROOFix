/**
 * Rich GitHub PR Comment Synthesizer
 * Formulates high-impact, visual Pull Request review comments featuring:
 * - Side-by-Side Visual Regression Slider & Pixel Diff Analysis
 * - Tamper-Proof Cryptographic SHA-256 Proof Badge
 * - Core Web Vitals Budget Gate (LCP <= 2.5s, CLS <= 0.1)
 * - 1-Click Interactive Self-Healing Patch URL & `/proofix fix` Trigger
 */

import type { RichPrReviewCommentData } from '../types/pr-bot.ts';
import { globalCoreWebVitalsGate } from '../performance/core-web-vitals-gate.ts';
import { globalVisualSliderGenerator } from '../visual/visual-slider-generator.ts';

export class RichPrBot {
  /**
   * Synthesizes the full Markdown comment body for GitHub Pull Requests.
   */
  public synthesizeComment(data: RichPrReviewCommentData): string {
    const isPassed = data.verificationPassed && data.vitalsGate.passed;
    const statusHeader = isPassed
      ? `## 🛡️ PROOFix Pull Request Quality Gate: 🟢 PASSED`
      : `## 🛡️ PROOFix Pull Request Quality Gate: 🔴 BLOCKED`;

    const durationSec = (data.durationMs / 1000).toFixed(2);
    const passRate = data.totalChecks > 0 ? ((data.passedChecks / data.totalChecks) * 100).toFixed(0) : '100';

    let md = `${statusHeader}\n\n`;

    // 1. Cryptographic Proof Badge & Fingerprint
    md += `### 🔐 Cryptographic Execution Evidence\n\n`;
    md += `${data.proofBadge.badgeMarkdown}\n\n`;
    md += `> **Cryptographic Fingerprint:** \`${data.proofBadge.fingerprint}\`\n`;
    md += `> **Certified By:** \`${data.proofBadge.certifiedBy}\` &bull; **Zero-Regression Pass Rate:** \`${passRate}%\`\n\n`;

    // 2. High-level Execution Metric Summary
    md += `| Quality Gate Status | Execution Run | Total Checks | Passed | Failed | Run Duration |\n`;
    md += `| :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    md += `| ${isPassed ? '🟢 **APPROVED**' : '🔴 **ACTION REQUIRED**'} | \`${data.runId}\` | **${data.totalChecks}** | **${data.passedChecks}** | **${data.failedChecks}** | \`${durationSec}s\` |\n\n`;

    // 3. Core Web Vitals Budget Gate (LCP <= 2.5s, CLS <= 0.1)
    md += `### ⚡ Core Web Vitals & Lighthouse Budget Gate\n\n`;
    md += globalCoreWebVitalsGate.formatMarkdownTable(data.vitalsGate);
    md += `\n\n`;

    // 4. Side-by-Side Visual Regression Slider
    if (data.visualComparisons && data.visualComparisons.length > 0) {
      md += `### 🖼️ Side-by-Side Visual Regression Analysis\n\n`;
      md += globalVisualSliderGenerator.formatMarkdownComparison(data.visualComparisons);
      md += `\n`;
    }

    // 5. Self-Healing Code Patch & 1-Click Fix
    if (data.selfHealingDiff) {
      md += `### 🩹 Proposed Self-Healing Code Patch\n\n`;
      md += `PROOFix isolated the exact failure root-cause and generated an atomic patch candidate:\n\n`;
      md += `\`\`\`diff\n${data.selfHealingDiff}\n\`\`\`\n\n`;

      md += `#### ⚡ Apply Self-Healing Resolution\n\n`;
      md += `Choose your preferred resolution workflow:\n\n`;
      md += `1. 👉 **[⚡ 1-Click Merge Self-Healing Patch](${data.oneClickApplyUrl})** — Interactively review and commit patch via web.\n`;
      md += `2. 💬 Comment **\`/proofix fix\`** or **\`/proofix heal\`** on this PR to automatically commit the patch directly to this branch.\n`;
      md += `3. 💻 Terminal: run \`npx proofix fix --apply\` locally to test and commit in your workspace.\n\n`;
    } else if (!isPassed) {
      md += `#### 🛠️ Recommended Action\n`;
      md += `Address the failing checks above or comment \`/proofix fix\` to re-run AI diagnosis.\n\n`;
    }

    md += `---\n`;
    md += `*“Don’t just generate code. Prove that it works.” &bull; Powered by [PROOFix](https://proofix.dev)*\n`;

    return md;
  }
}

export const globalRichPrBot = new RichPrBot();
