import { RouteStatusRecord, ProposedPatch } from './types';

export interface WebviewRenderOptions {
  routePath: string;
  statusRecord?: RouteStatusRecord;
  patchProposal?: ProposedPatch;
  serverUrl?: string;
}

/**
 * Generates self-contained HTML for the PROOFix Proof Canvas & Visual Verification Webview tab.
 */
export class ProofCanvasWebviewPanel {
  public static generateHtml(options: WebviewRenderOptions): string {
    const { routePath, statusRecord, patchProposal } = options;

    const isProven = statusRecord?.status === 'proven';
    const statusColor = isProven ? '#10b981' : statusRecord?.status === 'failing' ? '#ef4444' : '#38bdf8';
    const statusLabel = statusRecord?.status ? statusRecord.status.toUpperCase() : 'READY';

    const patchSection = patchProposal
      ? `
      <div class="patch-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:15px; color:#f8fafc;">🛠️ Proposed Self-Healing Fix</h3>
          <button class="btn btn-primary" onclick="vscode.postMessage({ command: 'applyPatch', proposalId: '${patchProposal.proposalId}' })">Apply Proven Fix</button>
        </div>
        <p style="font-size:13px; color:#94a3b8; margin:0 0 12px 0;">${patchProposal.explanation}</p>
        <pre class="diff-block"><code>${escapeHtml(patchProposal.unifiedDiff)}</code></pre>
      </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROOFix Canvas</title>
  <style>
    body { background-color: #020617; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}55; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .metric { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; }
    .metric-lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; }
    .metric-val { font-size: 20px; font-weight: bold; margin-top: 4px; color: #ffffff; }
    .patch-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .diff-block { background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto; color: #38bdf8; }
    .btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
    .btn-primary { background: #0284c7; color: #ffffff; }
    .btn-primary:hover { background: #0369a1; }
    .actions { display: flex; gap: 10px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin:0; font-size:18px;">🛡️ PROOFix Proof Canvas</h2>
      <p style="margin:4px 0 0 0; font-size:13px; color:#94a3b8;">Route: <code>${routePath}</code></p>
    </div>
    <span class="badge">${statusLabel}</span>
  </div>

  <div class="grid">
    <div class="metric"><div class="metric-lbl">Passed Journeys</div><div class="metric-val" style="color:#10b981;">${statusRecord?.passedJourneys ?? 0} / ${statusRecord?.totalJourneys ?? 0}</div></div>
    <div class="metric"><div class="metric-lbl">Duration</div><div class="metric-val">${statusRecord ? (statusRecord.durationMs / 1000).toFixed(1) : '0.0'}s</div></div>
    <div class="metric"><div class="metric-lbl">Last Verified</div><div class="metric-val" style="font-size:14px; margin-top:8px;">${statusRecord?.lastVerified ?? 'Never'}</div></div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick="vscode.postMessage({ command: 'runJourney', route: '${routePath}' })">▶ Run Journey</button>
    <button class="btn btn-primary" style="background:#059669;" onclick="vscode.postMessage({ command: 'proveRoute', route: '${routePath}' })">🛡️ Prove Route</button>
  </div>

  <div style="margin-top:24px;">
    <h3 style="font-size:15px; color:#38bdf8; margin:0 0 10px 0;">👁️ Interactive Visual Regression Split</h3>
    <div style="position:relative; width:100%; height:260px; background:#0f172a; border:1px solid #334155; border-radius:8px; overflow:hidden;">
      <div style="position:absolute; top:8px; left:8px; font-size:11px; color:#10b981; font-weight:bold; background:rgba(0,0,0,0.6); padding:2px 8px; border-radius:4px;">APPROVED BASELINE</div>
      <div style="position:absolute; top:8px; right:8px; font-size:11px; color:#38bdf8; font-weight:bold; background:rgba(0,0,0,0.6); padding:2px 8px; border-radius:4px;">PLAYWRIGHT ACTUAL</div>
      <div id="wv_slider_clip" style="position:absolute; top:0; left:0; width:50%; height:100%; border-right:2px solid #38bdf8; background:rgba(56,189,248,0.05);"></div>
    </div>
    <div style="margin-top:8px; display:flex; align-items:center;">
      <span style="font-size:11px; color:#94a3b8;">Baseline</span>
      <input type="range" min="0" max="100" value="50" style="flex:1; margin:0 12px; accent-color:#38bdf8;" oninput="document.getElementById('wv_slider_clip').style.width = this.value + '%'" />
      <span style="font-size:11px; color:#94a3b8;">Actual</span>
    </div>
  </div>

  ${patchSection}

  <script>
    const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : { postMessage: () => {} };
  </script>
</body>
</html>`;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
