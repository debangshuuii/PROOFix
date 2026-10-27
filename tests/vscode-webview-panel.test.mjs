import assert from 'node:assert/strict';
import { ProofCanvasWebviewPanel } from '../extensions/vscode-proofix/src/webview-panel.ts';

console.log('Testing ProofCanvas Webview Panel HTML...');

const html = ProofCanvasWebviewPanel.generateHtml({
  routePath: '/checkout',
  statusRecord: {
    routePath: '/checkout',
    status: 'proven',
    passedJourneys: 4,
    totalJourneys: 4,
    durationMs: 1100,
    lastVerified: '10:30 PM',
  },
  patchProposal: {
    proposalId: 'prop_999',
    targetFile: 'src/app/checkout/page.tsx',
    routePath: '/checkout',
    originalContent: 'old',
    patchedContent: 'new',
    unifiedDiff: '--- old\n+++ new\n@@ -1 +1 @@\n-broken\n+fixed',
    explanation: 'Fix hydration drift in checkout button',
    confidence: 0.99,
  },
});

assert.ok(html.startsWith('<!DOCTYPE html>'));
assert.ok(html.includes('Route: <code>/checkout</code>'));
assert.ok(html.includes('PROVEN'));
assert.ok(html.includes('Interactive Visual Regression Split'));
assert.ok(html.includes('wv_slider_clip'));
assert.ok(html.includes('Fix hydration drift in checkout button'));
assert.ok(html.includes('Apply Proven Fix'));

console.log('✅ ProofCanvas Webview Panel HTML tests passed!');
