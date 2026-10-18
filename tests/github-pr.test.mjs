import { createGitHubPullRequest } from '../src/lib/github/pr-creator.ts';
import assert from 'assert';

console.log('--- TEST: Authorized GitHub Branch & PR Creation ---');

const mockProposal = {
  id: 'prop_fix_sample_01',
  projectId: 'proj_fixture_01',
  runId: 'run_baseline',
  failureId: 'fail_res_03',
  commitSha: 'a1b2c3d4e5f6',
  explanation: 'Fix broken navigation link href pointing to missing route /broken-route',
  proposedChanges: `--- a/src/app/page.tsx\n+++ b/src/app/page.tsx\n@@ -38,1 +38,1 @@\n-old\n+new`,
  affectedFiles: ['src/fixtures/sample-app/src/app/page.tsx'],
  confidenceScore: 95,
  validationStatus: 'verified',
  verificationOutcome: {
    status: 'passed',
    summary: 'Verified Fix: Target failure resolved. Zero regressions detected.',
    durationMs: 40,
    testedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function testPRCreation() {
  // 1. Missing Token Rejection
  const unauthRes = await createGitHubPullRequest({
    proposal: mockProposal,
    repoUrl: 'https://github.com/debangshuuii/PROOFix',
    token: undefined,
    isMock: false,
  });
  assert.strictEqual(unauthRes.success, false);
  assert.ok(unauthRes.error.includes('Unauthorized'));
  console.log('[PASS] Missing token rejected with unauthorized error.');

  // 2. Mock Authorized PR Creation
  const authRes = await createGitHubPullRequest({
    proposal: mockProposal,
    repoUrl: 'https://github.com/debangshuuii/PROOFix',
    token: 'ghp_mock_token_123',
    isMock: true,
  });
  assert.strictEqual(authRes.success, true);
  assert.strictEqual(authRes.branchName, 'proofix/fix-prop_fix_sample_01');
  assert.ok(authRes.pullRequestUrl.includes('debangshuuii/PROOFix/pull/42'));
  console.log('[PASS] Dedicated branch and pull request created successfully.');

  console.log('All GitHub PR creation tests passed successfully!\n');
}

testPRCreation().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
