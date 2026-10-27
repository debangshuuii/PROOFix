import { VisualDiffDetail } from './action-types';

/**
 * Formats visual regression test results into an interactive GitHub-compliant collapsible details Markdown block.
 */
export function formatVisualDiffDetailsMarkdown(
  diffs: VisualDiffDetail[],
  proofPreviewUrl?: string
): string {
  if (!diffs || diffs.length === 0) {
    return '> ✅ **Visual Regression:** No UI regressions detected. All rendered viewports match approved baselines.\n';
  }

  const previewLink = proofPreviewUrl
    ? `\n> 🔍 **Interactive Zero-Auth Proof Preview:** [Open Interactive Before/After Slider](${proofPreviewUrl})\n`
    : '';

  const rows = diffs.map((d, i) => {
    const statusIcon = d.passed ? '🟢' : '🔴';
    const baselineImg = d.baselineScreenshotUrl ? `[Baseline](${d.baselineScreenshotUrl})` : 'None';
    const currentImg = d.currentScreenshotUrl ? `[Current](${d.currentScreenshotUrl})` : 'None';
    const diffImg = d.diffScreenshotUrl ? `[Diff Mask](${d.diffScreenshotUrl})` : 'None';

    return `| ${statusIcon} #${i + 1} | \`${d.route}\` | ${d.mismatchPixels} px | ${d.mismatchPercentage.toFixed(2)}% | ${baselineImg} | ${currentImg} | ${diffImg} |`;
  }).join('\n');

  return `
<details>
<summary><b>👁️ Visual Regression Auditing (${diffs.length} route${diffs.length > 1 ? 's' : ''} evaluated)</b></summary>

${previewLink}
| Status | Route | Pixel Delta | Drift % | Baseline | Current | Diff Map |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
${rows}

</details>
`.trim();
}

/**
 * Formats a badge string indicating pixel discrepancy severity.
 */
export function formatPixelDiscrepancyBadge(pixels: number, percentage: number): string {
  if (pixels === 0) {
    return '`0 px (0.00%)` ✅';
  }
  if (percentage < 0.5) {
    return `\`${pixels} px (${percentage.toFixed(2)}%)\` ⚠️ Minor`;
  }
  return `\`${pixels} px (${percentage.toFixed(2)}%)\` 🚨 Severe Regression`;
}

/**
 * Computes aggregated statistics for a collection of visual diff results.
 */
export function summarizeVisualDiscrepancies(diffs: VisualDiffDetail[]): {
  totalMismatchPixels: number;
  maxMismatchPct: number;
  passedCount: number;
  failedCount: number;
} {
  let totalMismatchPixels = 0;
  let maxMismatchPct = 0;
  let passedCount = 0;
  let failedCount = 0;

  for (const d of diffs) {
    totalMismatchPixels += d.mismatchPixels;
    if (d.mismatchPercentage > maxMismatchPct) {
      maxMismatchPct = d.mismatchPercentage;
    }
    if (d.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  return {
    totalMismatchPixels,
    maxMismatchPct,
    passedCount,
    failedCount,
  };
}
