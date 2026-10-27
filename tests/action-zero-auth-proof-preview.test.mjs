import assert from 'node:assert/strict';
import { generateZeroAuthProofPreviewHtml } from '../src/action/visual-slider-generator.ts';

console.log('Testing Standalone Zero-Auth Proof Preview Generator...');

const html = generateZeroAuthProofPreviewHtml({
  runId: 'run_preview_test_77',
  commitSha: 'fedcba0987654321',
  status: 'failed',
  totalChecks: 12,
  passedChecks: 10,
  failedChecks: 2,
  durationMs: 3800,
  visualDiffs: [
    {
      testId: 'v1',
      route: '/checkout',
      baselineScreenshotUrl: 'https://proofix.dev/base.png',
      currentScreenshotUrl: 'https://proofix.dev/curr.png',
      mismatchPixels: 220,
      mismatchPercentage: 1.85,
      passed: false,
    },
  ],
  proofFingerprint: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
});

assert.ok(html.startsWith('<!DOCTYPE html>'), 'Must be a full valid HTML document');
assert.ok(html.includes('run_preview_test_77'), 'Must include run ID');
assert.ok(html.includes('fedcba0'), 'Must include short commit sha');
assert.ok(html.includes('Visual Regression Sliders'), 'Must render visual sliders');
assert.ok(html.includes('4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'), 'Must embed SHA-256 fingerprint');
assert.ok(html.includes('type="range"'), 'Must have interactive slider input');

console.log('✅ Standalone Zero-Auth Proof Preview tests passed!');
