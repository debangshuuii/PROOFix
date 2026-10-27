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
