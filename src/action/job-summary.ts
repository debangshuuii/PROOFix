import fs from 'fs';
import path from 'path';
import { ActionRunResult } from './runner-adapter';

export interface JobSummaryData {
  runId?: string;
  status?: 'passed' | 'failed' | 'error';
  durationMs?: number;
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    blocked?: number;
    skipped?: number;
    inconclusive?: number;
  };
  results?: Array<{
    name: string;
    category?: string;
    status: string;
    actualResult?: string;
    failureCategory?: string;
    errorDetails?: { message?: string; url?: string };
  }>;
  reportPaths?: {
    json?: string;
    html?: string;
    artifactsZip?: string;
  };
}

/**
 * Generates formatted GitHub Job Summary markdown with graceful fallbacks.
 */
export function generateJobSummaryMarkdown(data?: JobSummaryData | null): string {
  if (!data) {
    return `### PROOFix Verification Run\n\n> ⚠️ No verification telemetry was generated for this job step.\n`;
  }

  const runId = data.runId || 'unknown_run';
  const status = (data.status || 'inconclusive').toUpperCase();
  const durationSec = ((data.durationMs || 0) / 1000).toFixed(2);
  const total = data.summary?.total ?? (data.results ? data.results.length : 0);
  const passed = data.summary?.passed ?? (data.results ? data.results.filter((r) => r.status === 'passed').length : 0);
  const failed = data.summary?.failed ?? (data.results ? data.results.filter((r) => r.status === 'failed').length : 0);
  const inconclusive = data.summary?.inconclusive ?? 0;

  const statusBadge =
    status === 'PASSED'
      ? '🟢 **PASSED**'
      : status === 'FAILED'
      ? '🔴 **FAILED**'
      : '🟡 **ERROR / INCONCLUSIVE**';

  let md = `## 🛡️ PROOFix Verification Summary\n\n`;
  md += `| Verification Outcome | Execution Run ID | Total Checks | Passed | Failed | Duration |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: |\n`;
  md += `| ${statusBadge} | \`${runId}\` | **${total}** | **${passed}** | **${failed}** | \`${durationSec}s\` |\n\n`;

  // Failed checks breakdown
  const failedList = (data.results || []).filter((r) => r.status === 'failed');
  if (failedList.length > 0) {
    md += `### ❌ Failed Verification Checks (${failedList.length})\n\n`;
    md += `| Check Name | Category | Failure Reason | Target URL |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const f of failedList) {
      const reason = (f.errorDetails?.message || f.actualResult || 'Assertion failed').replace(/\|/g, '\\|');
      const url = f.errorDetails?.url ? `\`${f.errorDetails.url}\`` : 'N/A';
      md += `| **${f.name}** | \`${f.category || 'general'}\` | ${reason} | ${url} |\n`;
    }
    md += `\n`;
  } else {
    md += `> ✅ **All evaluated route availability, user flow, and visual regression checks passed.**\n\n`;
  }

  // Passing checks breakdown
  const passedList = (data.results || []).filter((r) => r.status === 'passed');
  if (passedList.length > 0) {
    md += `<details><summary><strong>View Passed Checks (${passedList.length})</strong></summary>\n\n`;
    md += `| Check Name | Category | Status |\n`;
    md += `| :--- | :--- | :---: |\n`;
    for (const p of passedList) {
      md += `| ${p.name} | \`${p.category || 'smoke'}\` | 🟢 Passed |\n`;
    }
    md += `\n</details>\n\n`;
  }

  // Reports and Artifacts links
  md += `### 📦 Reports & Artifacts\n`;
  if (data.reportPaths?.html) {
    md += `- **Interactive HTML Report:** \`${path.basename(data.reportPaths.html)}\`\n`;
  }
  if (data.reportPaths?.json) {
    md += `- **Structured JSON Report:** \`${path.basename(data.reportPaths.json)}\`\n`;
  }
  if (data.reportPaths?.artifactsZip) {
    md += `- **Packaged Artifacts Bundle:** \`${path.basename(data.reportPaths.artifactsZip)}\`\n`;
  }
  if (!data.reportPaths?.html && !data.reportPaths?.json && !data.reportPaths?.artifactsZip) {
    md += `- _Artifact packaging complete in workflow workspace._\n`;
  }

  md += `\n---\n*Generated automatically by [PROOFix](https://github.com/debangshuuii/PROOFix) GitHub Action.*`;

  return md;
}

/**
 * Writes markdown summary to GITHUB_STEP_SUMMARY environment file.
 */
export async function writeJobSummary(
  summaryMarkdown: string,
  stepSummaryFile?: string
): Promise<boolean> {
  const targetFile = stepSummaryFile || process.env.GITHUB_STEP_SUMMARY;
  if (!targetFile) {
    return false;
  }

  try {
    await fs.promises.appendFile(targetFile, summaryMarkdown + '\n', 'utf-8');
    return true;
  } catch (err) {
    console.warn('Could not write to GITHUB_STEP_SUMMARY:', err);
    return false;
  }
}
