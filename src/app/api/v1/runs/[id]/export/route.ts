import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'html';

    const run = await db.getRunById(id);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const project = await db.getProjectById(run.projectId);
    const testResults = await db.getTestResults(id);
    const findings = await db.getFindings(id);

    if (format === 'json') {
      const exportData = {
        meta: {
          product: 'PROOFix',
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        },
        project,
        run,
        testResults,
        findings,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="proofix-report-${id}.json"`,
        },
      });
    }

    // Generate Standalone HTML Report
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PROOFix Verification Report - ${escapeHtml(project?.name || 'Project')} (Run #${run.runNumber})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 32px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .tagline { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .stat-val { font-size: 28px; font-weight: bold; margin-top: 4px; }
    .passed { color: #4ade80; }
    .failed { color: #f87171; }
    .inconclusive { color: #fbbf24; }
    .section-title { font-size: 20px; font-weight: 600; margin: 32px 0 16px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .test-item { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-passed { background: #14532d; color: #4ade80; }
    .badge-failed { background: #7f1d1d; color: #f87171; }
    .badge-inconclusive { background: #78350f; color: #fbbf24; }
    .finding-card { background: #1e293b; border-left: 4px solid #f87171; border-radius: 4px 8px 8px 4px; padding: 16px; margin-bottom: 16px; }
    pre { background: #0b1120; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; overflow-x: auto; font-family: monospace; font-size: 13px; }
    .diff-del { color: #f87171; }
    .diff-add { color: #4ade80; }
    .disclaimer { background: #1e293b; border: 1px dashed #475569; padding: 16px; border-radius: 8px; font-size: 13px; color: #94a3b8; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PROOFix Verification Report</div>
      <div class="tagline">Don't just generate code. Prove that it works.</div>
      <div style="margin-top: 16px; display: flex; gap: 24px; font-size: 14px; color: #94a3b8;">
        <div>Project: <strong style="color: #f8fafc;">${escapeHtml(project?.name || 'Unknown')}</strong></div>
        <div>Run: <strong style="color: #f8fafc;">#${run.runNumber} (${run.id})</strong></div>
        <div>Commit: <code>${run.commitHash}</code></div>
        <div>Started: ${new Date(run.startedAt).toLocaleString()}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="stat-card">
        <div style="color: #94a3b8; font-size: 13px;">Total Checks</div>
        <div class="stat-val">${run.summary.total}</div>
      </div>
      <div class="stat-card">
        <div style="color: #94a3b8; font-size: 13px;">Passed</div>
        <div class="stat-val passed">${run.summary.passed}</div>
      </div>
      <div class="stat-card">
        <div style="color: #94a3b8; font-size: 13px;">Failed</div>
        <div class="stat-val failed">${run.summary.failed}</div>
      </div>
      <div class="stat-card">
        <div style="color: #94a3b8; font-size: 13px;">Inconclusive</div>
        <div class="stat-val inconclusive">${run.summary.inconclusive}</div>
      </div>
    </div>

    <h2 class="section-title">Playwright Browser Test Checks</h2>
    ${testResults
      .map(
        (t) => `
      <div class="test-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 600;">${escapeHtml(t.name)}</div>
          <span class="badge badge-${t.status}">${t.status}</span>
        </div>
        <div style="color: #94a3b8; font-size: 14px; margin-top: 6px;">${escapeHtml(t.actualResult)}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Duration: ${t.durationMs}ms | Category: ${t.category}</div>
      </div>
    `
      )
      .join('')}

    ${
      findings.length > 0
        ? `
      <h2 class="section-title">Evidence-Based AI Diagnosis & Repair Proposals</h2>
      ${findings
        .map(
          (f) => `
        <div class="finding-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: bold; color: #f87171;">${escapeHtml(f.title)}</div>
            <span class="badge" style="background: #334155; color: #f8fafc;">Confidence: ${f.confidenceScore}%</span>
          </div>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Observed Fact:</strong> ${escapeHtml(f.observedEvidence)}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>AI Probabilistic Hypothesis:</strong> ${escapeHtml(f.aiHypothesis)}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Recommended Fix:</strong> ${escapeHtml(f.suggestedFix)}</p>
          ${
            f.patchPreview
              ? `<div style="margin-top: 10px;">
                  <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Proposed Patch Preview:</div>
                  <pre>${escapeHtml(f.patchPreview)}</pre>
                </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    `
        : ''
    }

    <div class="disclaimer">
      <strong>PROOFix Core Principle:</strong> Never claim an application works without evidence from actual checks.
      Untested routes, destructive flows bypassed by safety policies, or unexercised business logic are not certified as bug-free.
      Generated with PROOFix v1.0.0.
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="proofix-report-${id}.html"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
