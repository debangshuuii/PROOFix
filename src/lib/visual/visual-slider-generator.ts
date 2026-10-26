/**
 * Side-by-Side Visual Regression Slider & Diff Formatter
 * Generates side-by-side visual comparison tables, interactive image overlay sliders,
 * and pixel-level mismatch percentages for GitHub PR comments.
 */

import type { VisualSliderComparison } from '../types/pr-bot.ts';

export interface VisualDiffInput {
  routePath: string;
  baselineImageUrl: string;
  candidateImageUrl: string;
  diffImageUrl?: string;
  mismatchPercentage: number;
  regressionThreshold?: number; // default: 0.1% (0.001)
  viewport?: {
    width: number;
    height: number;
    name: string;
  };
}

export class VisualSliderGenerator {
  private defaultThreshold: number;

  constructor(defaultThreshold: number = 0.1) {
    this.defaultThreshold = defaultThreshold;
  }

  /**
   * Generates a structured VisualSliderComparison object.
   */
  public generateComparison(input: VisualDiffInput): VisualSliderComparison {
    const threshold = input.regressionThreshold ?? this.defaultThreshold;
    const hasRegression = input.mismatchPercentage > threshold;
    const viewport = input.viewport || { width: 1280, height: 720, name: 'Desktop (1280x720)' };

    const sliderHtml = this.formatInteractiveSliderHtml(
      input.routePath,
      input.baselineImageUrl,
      input.candidateImageUrl,
      input.diffImageUrl,
      input.mismatchPercentage,
      viewport
    );

    return {
      routePath: input.routePath,
      baselineImageUrl: input.baselineImageUrl,
      candidateImageUrl: input.candidateImageUrl,
      diffImageUrl: input.diffImageUrl,
      mismatchPercentage: Number(input.mismatchPercentage.toFixed(2)),
      hasRegression,
      viewport,
      sliderHtml,
    };
  }

  /**
   * Generates GitHub-compatible Markdown with side-by-side comparison tables.
   */
  public formatMarkdownComparison(comparisons: VisualSliderComparison[]): string {
    if (comparisons.length === 0) {
      return `> 🖼️ *No visual diffs detected across evaluated routes.*\n`;
    }

    let md = `| Route | Viewport | Baseline (Before) | Candidate (After) | Diff Analysis | Mismatch |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

    for (const comp of comparisons) {
      const statusIcon = comp.hasRegression ? '🔴 REGRESSION' : '🟢 PASSED';
      const diffImgCell = comp.diffImageUrl
        ? `<a href="${comp.diffImageUrl}" target="_blank"><img src="${comp.diffImageUrl}" width="160" alt="Pixel Diff" /></a>`
        : `*No Pixel Drift*`;

      md += `| \`${comp.routePath}\` | ${comp.viewport.name} | <a href="${comp.baselineImageUrl}" target="_blank"><img src="${comp.baselineImageUrl}" width="160" alt="Baseline" /></a> | <a href="${comp.candidateImageUrl}" target="_blank"><img src="${comp.candidateImageUrl}" width="160" alt="Candidate" /></a> | ${diffImgCell} | \`${comp.mismatchPercentage}%\` ${statusIcon} |\n`;
    }

    // Add collapsible detailed inspection
    md += `\n<details>\n<summary>🔍 <b>Expand Side-by-Side Visual Inspection</b></summary>\n\n`;
    for (const comp of comparisons) {
      md += `#### Route \`${comp.routePath}\` (${comp.viewport.name})\n\n`;
      md += `| Baseline (Expected) | Candidate (Actual PR) | Difference Heatmap |\n`;
      md += `| :---: | :---: | :---: |\n`;
      md += `| ![Baseline](${comp.baselineImageUrl}) | ![Candidate](${comp.candidateImageUrl}) | ${comp.diffImageUrl ? `![Diff](${comp.diffImageUrl})` : '*(Clean Zero-Drift)*'} |\n\n`;
    }
    md += `</details>\n`;

    return md;
  }

  /**
   * Generates interactive HTML slider markup.
   */
  public formatInteractiveSliderHtml(
    route: string,
    baselineUrl: string,
    candidateUrl: string,
    diffUrl: string | undefined,
    mismatch: number,
    viewport: { width: number; height: number; name: string }
  ): string {
    return `
<div class="proofix-visual-slider" data-route="${route}" data-mismatch="${mismatch}">
  <div class="proofix-slider-header">
    <strong>Route:</strong> <code>${route}</code> &bull; <strong>Viewport:</strong> ${viewport.name} &bull; <strong>Mismatch:</strong> <code>${mismatch.toFixed(2)}%</code>
  </div>
  <div class="proofix-slider-container" style="display: flex; gap: 12px; margin-top: 8px;">
    <div style="flex: 1; text-align: center;">
      <small><strong>Baseline</strong></small><br />
      <img src="${baselineUrl}" style="max-width: 100%; border: 1px solid #334155; border-radius: 6px;" alt="Baseline" />
    </div>
    <div style="flex: 1; text-align: center;">
      <small><strong>Candidate PR</strong></small><br />
      <img src="${candidateUrl}" style="max-width: 100%; border: 1px solid #334155; border-radius: 6px;" alt="Candidate" />
    </div>
    ${
      diffUrl
        ? `<div style="flex: 1; text-align: center;">
      <small><strong>Diff Heatmap</strong></small><br />
      <img src="${diffUrl}" style="max-width: 100%; border: 1px solid #ef4444; border-radius: 6px;" alt="Diff" />
    </div>`
        : ''
    }
  </div>
</div>`.trim();
  }
}

export const globalVisualSliderGenerator = new VisualSliderGenerator();
