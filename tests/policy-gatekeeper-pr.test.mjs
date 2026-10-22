import assert from 'assert';
import {
  assessPatchRisk,
  checkHealingRateLimit,
  recordHealingAttempt,
  evaluateSelfHealingGate,
} from '../src/lib/repair/policy-gatekeeper.ts';
import {
  formatSelfHealingPrBody,
  generateLocalPatchScript,
  publishSelfHealingPullRequest,
} from '../src/lib/repair/github-publisher.ts';

console.log('===========================================================');
console.log('PROOFix Policy Gatekeeper & GitHub PR Publisher Test Suite');
console.log('===========================================================\n');

async function runTests() {
  // Test 1: File Sensitivity & Risk Tier Assessment
  console.log('[TEST 1] Assessing patch risk across sensitivity tiers...');
  const lowRiskDiff = `--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -1,3 +1,3 @@
-.button { color: red; }
+.button { color: blue; }
`;
  const lowRiskAssessment = assessPatchRisk(lowRiskDiff);
  assert.strictEqual(lowRiskAssessment.overallTier, 'tier1_low');
  assert.strictEqual(lowRiskAssessment.autoApplyPermitted, true);
  assert.strictEqual(lowRiskAssessment.requiresHumanApproval, false);

  const highRiskDiff = `--- a/src/app/api/auth/route.ts
+++ b/src/app/api/auth/route.ts
@@ -10,3 +10,3 @@
-const token = null;
+const token = "bearer_payload";
`;
  const highRiskAssessment = assessPatchRisk(highRiskDiff);
  assert.strictEqual(highRiskAssessment.overallTier, 'tier4_critical');
  assert.strictEqual(highRiskAssessment.requiresHumanApproval, true);
  assert.strictEqual(highRiskAssessment.autoApplyPermitted, false);
  console.log('  ✓ Sensitivity tiers and security boundaries evaluated accurately.');

  // Test 2: Rate Limiter & Failure Cooldown
  console.log('\n[TEST 2] Verifying healing rate limiter and consecutive failure cooldown...');
  const projectId = `proj_test_${Date.now()}`;

  // Initially allowed
  const initCheck = checkHealingRateLimit(projectId);
  assert.strictEqual(initCheck.allowed, true);

  // Record 3 consecutive failures
  recordHealingAttempt(projectId, 'failure');
  recordHealingAttempt(projectId, 'failure');
  recordHealingAttempt(projectId, 'failure');

  const blockedCheck = checkHealingRateLimit(projectId);
  assert.strictEqual(blockedCheck.allowed, false, '3 consecutive failures must trigger cooldown');
  assert.ok(blockedCheck.reason?.includes('cooldown'));

  // Reset on success
  recordHealingAttempt(projectId, 'success');
  const restoredCheck = checkHealingRateLimit(projectId);
  assert.strictEqual(restoredCheck.allowed, true, 'Success must reset failure counter');
  console.log('  ✓ Rate limiter effectively prevented runaway failure loops.');

  // Test 3: Master Gatekeeper Decision Engine
  console.log('\n[TEST 3] Evaluating master gatekeeper decisions across autonomy modes...');
  const safeComponentDiff = `--- a/src/components/Card.tsx
+++ b/src/components/Card.tsx
@@ -5,3 +5,3 @@
-return <div>Old</div>;
+return <div>New</div>;
`;

  const manualDecision = evaluateSelfHealingGate({
    projectId: `proj_manual_${Date.now()}`,
    diffText: safeComponentDiff,
    confidenceScore: 95,
    mode: 'manual_review_only',
  });
  assert.strictEqual(manualDecision.permitAction, 'manual_review_only');

  const autoDecision = evaluateSelfHealingGate({
    projectId: `proj_auto_${Date.now()}`,
    diffText: safeComponentDiff,
    confidenceScore: 92,
    mode: 'fully_autonomous',
  });
  assert.strictEqual(autoDecision.permitAction, 'auto_apply');

  const criticalDecision = evaluateSelfHealingGate({
    projectId: `proj_crit_${Date.now()}`,
    diffText: highRiskDiff,
    confidenceScore: 99,
    mode: 'fully_autonomous',
  });
  assert.strictEqual(criticalDecision.permitAction, 'manual_review_only', 'Critical auth changes cannot be silently auto-applied');
  console.log('  ✓ Autonomy modes and safety tiers enforced with zero-trust guardrails.');

  // Test 4: Rich PR Formatting & Local Script Generation
  console.log('\n[TEST 4] Formatting rich Pull Request body and local script fallback...');
  const mockSession = {
    id: 'heal_sess_01',
    runId: 'run_eval_01',
    failureId: 'fail_broken_link_404',
    config: {
      targetBranchPrefix: 'proofix/heal-',
      createDraftPullRequest: true,
    },
    iterations: [
      {
        iterationNumber: 1,
        verificationDurationMs: 1400,
      },
    ],
    maxIterations: 3,
  };

  const mockProposal = {
    id: 'prop_01',
    explanation: 'Repaired broken /broken-route link by directing to valid /about route.',
    confidenceScore: 94,
    proposedChanges: safeComponentDiff,
    commitSha: 'c0ffee123456',
  };

  const mockProvingReport = {
    regressionCheckResults: [
      { name: 'Accessibility Audit', passed: true, durationMs: 40 },
      { name: 'Layout Overflow', passed: true, durationMs: 35 },
    ],
  };

  const prBody = formatSelfHealingPrBody(mockSession, mockProposal, 'run_eval_01', {}, mockProvingReport);
  assert.ok(prBody.includes('PROOFix Autonomous Self-Healing Verification Proof'));
  assert.ok(prBody.includes('**Confidence Score**: `94%`'));
  assert.ok(prBody.includes('Regression Verification Matrix'));
  assert.ok(prBody.includes('Accessibility Audit'));

  const localScripts = generateLocalPatchScript('proofix/heal-branch', safeComponentDiff);
  assert.strictEqual(localScripts.length, 3);
  assert.ok(localScripts[0].startsWith('git checkout -b'));
  console.log('  ✓ Rich PR markdown and copy-paste CLI fallback generated successfully.');

  // Test 5: Mock GitHub Pull Request Publishing
  console.log('\n[TEST 5] Testing pull request creation with mock API fetch...');
  const mockFetch = async (url, init) => {
    if (url.includes('/git/refs')) {
      return { ok: true, status: 201, json: async () => ({ ref: 'refs/heads/proofix/heal-branch' }) };
    }
    if (url.includes('/pulls')) {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          html_url: 'https://github.com/debangshuuii/PROOFix/pull/99',
          number: 99,
        }),
      };
    }
    return { ok: false, status: 404, text: async () => 'Not found' };
  };

  const pubResult = await publishSelfHealingPullRequest(
    mockSession,
    mockProposal,
    {
      repoOwner: 'debangshuuii',
      repoName: 'PROOFix',
      mockApiFetch: mockFetch,
    },
    mockProvingReport
  );

  assert.strictEqual(pubResult.success, true);
  assert.strictEqual(pubResult.pullRequestNumber, 99);
  assert.strictEqual(pubResult.pullRequestUrl, 'https://github.com/debangshuuii/PROOFix/pull/99');
  console.log('  ✓ Pull request published successfully to branch:', pubResult.branchName);

  console.log('\n===========================================================');
  console.log('ALL 5 POLICY GATEKEEPER & PR PUBLISHER TESTS PASSED!');
  console.log('===========================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
