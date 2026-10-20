import assert from 'node:assert/strict';
import {
  formatSelfHealingPrBody,
  publishSelfHealingPullRequest,
} from '../src/lib/repair/github-publisher.ts';
import { getDefaultSelfHealingConfig } from '../src/lib/repair/self-healing-policy.ts';

console.log('--- Testing GitHub Automated PR Publisher & Evidence Attacher (Contribution 8 / 108) ---');

function testPrBodyFormatting() {
  const session = {
    id: 'heal_sess_108',
    runId: 'run_108',
    projectId: 'proj_108',
    failureId: 'fail_missing_btn',
    status: 'completed',
    currentIteration: 1,
    maxIterations: 3,
    config: getDefaultSelfHealingConfig(),
    iterations: [
      {
        iterationNumber: 1,
        proposalId: 'prop_01',
        diffSummary: 'Add accessible label',
        verificationStatus: 'passed',
        verificationDurationMs: 1450,
        failingChecksResolved: ['Button Click Check'],
        newFailuresIntroduced: [],
        diagnostics: 'Clean pass',
        timestamp: new Date().toISOString(),
      },
    ],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const proposal = {
    id: 'prop_108_abc',
    projectId: 'proj_108',
    runId: 'run_108',
    failureId: 'fail_missing_btn',
    commitSha: 'a1b2c3d',
    explanation: 'Attach aria-label to button',
    proposedChanges: '--- a/btn.tsx\n+++ b/btn.tsx\n@@ -1,2 +1,2 @@\n-<button>\n+<button aria-label="Submit">\n',
    affectedFiles: ['src/components/btn.tsx'],
    confidenceScore: 92,
    validationStatus: 'valid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const body = formatSelfHealingPrBody(session, proposal, 'run_108', {
    reportUrl: 'https://proofix.dev/reports/run_108',
    videoUrl: 'https://proofix.dev/videos/run_108.mp4',
  });

  assert.ok(body.includes('PROOFix Autonomous Self-Healing Verification Proof'));
  assert.ok(body.includes('VERIFIED FIX'));
  assert.ok(body.includes('Attach aria-label to button'));
  assert.ok(body.includes('https://proofix.dev/reports/run_108'));
  assert.ok(body.includes('https://proofix.dev/videos/run_108.mp4'));
  assert.ok(body.includes('+<button aria-label="Submit">'));

  console.log('[PASS] Self-healing Pull Request Markdown body formatting validated.');
}

async function testGitHubPrPublishingWithMock() {
  const session = {
    id: 'heal_sess_108',
    runId: 'run_sample_108',
    projectId: 'proj_108',
    failureId: 'fail_01',
    status: 'completed',
    currentIteration: 1,
    maxIterations: 3,
    config: getDefaultSelfHealingConfig(),
    iterations: [],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const proposal = {
    id: 'prop_001',
    projectId: 'proj_108',
    runId: 'run_sample_108',
    failureId: 'fail_01',
    commitSha: 'a1b2c3d4e5f6',
    explanation: 'Fix',
    proposedChanges: '+line',
    affectedFiles: ['file.ts'],
    confidenceScore: 85,
    validationStatus: 'valid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mock GitHub API responses
  const apiCalls = [];
  const mockFetch = async (url, init) => {
    apiCalls.push({ url, method: init.method, body: JSON.parse(init.body) });
    if (url.includes('/git/refs')) {
      return new Response(JSON.stringify({ ref: 'refs/heads/proofix/heal-branch' }), { status: 201 });
    }
    if (url.includes('/pulls')) {
      return new Response(
        JSON.stringify({
          number: 77,
          html_url: 'https://github.com/test-org/test-repo/pull/77',
        }),
        { status: 201 }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  const result = await publishSelfHealingPullRequest(session, proposal, {
    repoOwner: 'test-org',
    repoName: 'test-repo',
    token: 'ghp_fakeToken12345678901234567890',
    mockApiFetch: mockFetch,
  });

  assert.equal(result.success, true);
  assert.equal(result.pullRequestNumber, 77);
  assert.equal(result.pullRequestUrl, 'https://github.com/test-org/test-repo/pull/77');
  assert.equal(apiCalls.length, 2);
  assert.ok(apiCalls[0].url.includes('/git/refs'));
  assert.ok(apiCalls[1].url.includes('/pulls'));
  console.log('[PASS] Automated PR creation executed via GitHub API with branch and PR linkage.');

  // Test missing token error handling
  const noTokenResult = await publishSelfHealingPullRequest(session, proposal, {
    repoOwner: 'test-org',
    repoName: 'test-repo',
    token: '',
  });
  assert.equal(noTokenResult.success, false);
  assert.ok(noTokenResult.error.includes('Missing GitHub authorization token'));
  console.log('[PASS] Missing authorization token handled safely with descriptive error.');
}

async function runSuite() {
  testPrBodyFormatting();
  await testGitHubPrPublishingWithMock();
  console.log('[ALL PASS] Contribution 8 (108) test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] PR publisher test error:', err);
  process.exit(1);
});
