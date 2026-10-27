import assert from 'node:assert/strict';
import { buildStickyPrCommentMarkdown } from '../src/action/sticky-pr-comment.ts';

console.log('Testing Sticky PR Comment Builder...');

const markdown = buildStickyPrCommentMarkdown({
  prNumber: 99,
  repoOwner: 'debangshuuii',
  repoName: 'PROOFix',
  commitSha: 'a1b2c3d4e5f6',
  runId: 'run_sticky_test',
  status: 'failed',
  summary: {
    total: 10,
    passed: 8,
    failed: 2,
    durationMs: 4200,
  },
  hydrationDrifts: [
    {
      route: '/checkout',
      component: 'CheckoutForm',
      errorMessage: 'Hydration failed: server/client mismatch (React 19 #418)',
      serverValue: '$100',
      clientValue: '$120',
      timestamp: new Date().toISOString(),
    },
  ],
  brokenRoutes: [
    {
      route: '/legacy-checkout',
      httpStatus: 404,
      referringPage: '/cart',
    },
  ],
  visualDiffs: [
    {
      testId: 'diff_01',
      route: '/home',
      mismatchPixels: 45,
      mismatchPercentage: 0.12,
      passed: true,
    },
  ],
  videoSteps: [
    {
      stepIndex: 4,
      stepName: 'Checkout Click',
      status: 'failed',
      videoTimestampSec: 3.5,
      videoUrl: 'https://proofix.dev/artifacts/run_sticky_test.webm',
      errorSnippet: 'Button not interactive',
    },
  ],
  autoFix: {
    workflowName: 'proofix-autofix.yml',
    dispatchUrl: 'https://github.com/debangshuuii/PROOFix/actions/workflows/proofix-autofix.yml',
    branchName: 'fix/cart-button',
    buttonMarkdown: '[![Prove & Auto-Fix](https://img.shields.io/badge/PROOFix-Prove_%26_Auto--Fix-0284c7)](https://github.com/debangshuuii/PROOFix)',
  },
  proofBadgeMarkdown: '![PROOFix: Proven](https://img.shields.io/badge/PROOFix-Failed-red)',
  proofFingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  proofPreviewUrl: 'proof-preview-run_sticky_test.html',
});

// Verify critical sections
assert.ok(markdown.includes('<!-- proofix-sticky-pr-comment -->'), 'Must have sticky marker');
assert.ok(markdown.includes('React 19 SSR Hydration Drift Gate Violations (#418)'), 'Must include hydration section');
assert.ok(markdown.includes('Dead Navigation Routes & 404 Auditing'), 'Must include broken routes section');
assert.ok(markdown.includes('Failure Video Recording & Timeline Bookmarks'), 'Must include failure video section');
assert.ok(markdown.includes('Self-Healing Auto-Repair Available'), 'Must include auto-repair section');
assert.ok(markdown.includes('proof-preview-run_sticky_test.html'), 'Must link proof preview');
assert.ok(markdown.includes('e3b0c44298fc1c14'), 'Must include proof fingerprint');

console.log('✅ Sticky PR Comment Builder tests passed!');
