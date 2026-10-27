import { VisualDiffDetail } from './action-types';

/**
 * Generates an interactive before/after split visual slider in pure HTML5/CSS.
 */
export function generateInlineSliderHtml(diff: VisualDiffDetail, sliderId: string = 'slider_01'): string {
  const baseline = diff.baselineScreenshotUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="%231e293b"/><text x="50%" y="50%" fill="%2394a3b8" text-anchor="middle">No Baseline</text></svg>';
  const current = diff.currentScreenshotUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="%230f172a"/><text x="50%" y="50%" fill="%23ef4444" text-anchor="middle">Current Failure</text></svg>';

  return `
<div class="proofix-slider-container" id="${sliderId}" style="position:relative; width:100%; max-width:720px; overflow:hidden; border-radius:8px; border:1px solid #334155; font-family:system-ui,sans-serif; background:#0f172a; margin:12px 0;">
  <div style="position:relative; width:100%; height:380px; overflow:hidden;">
    <!-- Base: Current (After) -->
    <img src="${current}" alt="Current Render" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:#0f172a;" />
    
    <!-- Overlay: Baseline (Before) -->
    <div id="${sliderId}_clip" style="position:absolute; top:0; left:0; width:50%; height:100%; overflow:hidden; border-right:2px solid #38bdf8; background:#0f172a; box-shadow: 2px 0 10px rgba(0,0,0,0.5);">
      <img src="${baseline}" alt="Baseline Render" style="position:absolute; top:0; left:0; width:720px; height:100%; object-fit:contain;" />
      <span style="position:absolute; top:8px; left:8px; background:rgba(15,23,42,0.85); color:#38bdf8; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #0284c7;">BASELINE (EXPECTED)</span>
    </div>

    <span style="position:absolute; top:8px; right:8px; background:rgba(15,23,42,0.85); color:#f87171; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #dc2626;">CURRENT (ACTUAL)</span>
  </div>

  <!-- Interactive Slider Control -->
  <div style="padding:10px 14px; background:#1e293b; display:flex; align-items:center; justify-content:space-between; border-top:1px solid #334155;">
    <span style="font-size:12px; color:#94a3b8; font-weight:500;">◀ Baseline</span>
    <input type="range" min="0" max="100" value="50" style="flex:1; margin:0 12px; accent-color:#38bdf8; cursor:ew-resize;" oninput="document.getElementById('${sliderId}_clip').style.width = this.value + '%'" />
    <span style="font-size:12px; color:#94a3b8; font-weight:500;">Current ▶</span>
  </div>
</div>
`.trim();
}

export interface ZeroAuthPreviewOptions {
  runId: string;
  commitSha: string;
  status: 'passed' | 'failed' | 'error';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  durationMs: number;
  visualDiffs: VisualDiffDetail[];
  proofFingerprint: string;
}

/**
 * Generates a self-contained zero-auth HTML proof preview artifact.
 */
export function generateZeroAuthProofPreviewHtml(options: ZeroAuthPreviewOptions): string {
  const statusColor = options.status === 'passed' ? '#10b981' : '#ef4444';
  const statusLabel = options.status.toUpperCase();

  const slidersHtml = options.visualDiffs.length > 0
    ? options.visualDiffs.map((diff, idx) => `
        <div style="margin-bottom:28px;">
          <h3 style="color:#f1f5f9; font-size:15px; margin:0 0 8px 0;">Diff #${idx + 1}: ${diff.route}</h3>
          <p style="color:#94a3b8; font-size:13px; margin:0 0 10px 0;">
            Mismatch: <strong style="color:#f87171;">${diff.mismatchPixels} px</strong> (${diff.mismatchPercentage.toFixed(2)}%)
          </p>
          ${generateInlineSliderHtml(diff, `slider_${idx}`)}
        </div>
      `).join('')
    : '<p style="color:#94a3b8; font-size:14px;">No visual regression differences detected. All visual states match baselines perfectly.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROOFix Standalone Proof Preview - ${options.runId}</title>
  <style>
    body { background-color: #020617; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .metric-box { background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
    .metric-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
    .metric-val { font-size: 18px; font-weight: bold; color: #f8fafc; margin-top: 4px; }
    .fingerprint { font-family: monospace; font-size: 11px; color: #38bdf8; word-break: break-all; background: #020617; padding: 8px; border-radius: 6px; border: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 style="font-size:22px; margin:0; color:#ffffff;">🛡️ PROOFix Proof Preview</h1>
        <p style="font-size:13px; color:#94a3b8; margin:4px 0 0 0;">Run ID: ${options.runId} • Commit: <code>${options.commitSha.slice(0, 7)}</code></p>
      </div>
      <span class="badge">${statusLabel}</span>
    </div>

    <div class="metric-grid">
      <div class="metric-box"><div class="metric-label">Total Checks</div><div class="metric-val">${options.totalChecks}</div></div>
      <div class="metric-box"><div class="metric-label">Passed</div><div class="metric-val" style="color:#10b981;">${options.passedChecks}</div></div>
      <div class="metric-box"><div class="metric-label">Failed</div><div class="metric-val" style="color:#ef4444;">${options.failedChecks}</div></div>
      <div class="metric-box"><div class="metric-label">Duration</div><div class="metric-val">${(options.durationMs / 1000).toFixed(1)}s</div></div>
    </div>

    <h2 style="font-size:16px; margin:24px 0 12px 0; color:#38bdf8;">Visual Regression Sliders</h2>
    ${slidersHtml}

    <h2 style="font-size:16px; margin:24px 0 12px 0; color:#38bdf8;">Cryptographic Proof Fingerprint</h2>
    <div class="fingerprint">SHA-256: ${options.proofFingerprint}</div>
  </div>
</body>
</html>`;
}
