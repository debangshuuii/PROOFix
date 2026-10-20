/**
 * PROOFix Master Self-Healing & Verified Pull Request Loop CI Regression Suite
 * Covering Point 1 / Contributions 101 through 110
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Policy & Preconditions (Contribution 101)
import {
  validateSelfHealingConfig,
  getDefaultSelfHealingConfig,
  isPathEligibleForRepair,
  evaluateSelfHealingEligibility,
} from '../src/lib/repair/self-healing-policy.ts';

// 2. Failure Context Synthesis & Secret Redaction (Contribution 102)
import { synthesizeFailureContext } from '../src/lib/repair/context-synthesizer.ts';
import { redactSensitiveData } from '../src/lib/security/redactor.ts';

// 3. Surgical Patch Generation Engine (Contribution 103)
import {
  formatUnifiedDiff,
  assertSafePatchContent,
  generateSurgicalPatch,
} from '../src/lib/repair/patch-generator.ts';

// 4. Ephemeral Workspace Isolation & Snapshot Rollback (Contribution 104)
import {
  createEphemeralWorkspace,
  createWorkspaceSnapshot,
  rollbackWorkspace,
  cleanupEphemeralWorkspace,
} from '../src/lib/repair/ephemeral-workspace.ts';

// 5. Atomic Patch Applier & Conflict Rejection (Contribution 105)
import { applyPatchAtomically } from '../src/lib/repair/patch-applier.ts';

// 6. Post-Patch Verification Prover & Regression Detection (Contribution 106)
import { provePatchFix } from '../src/lib/repair/patch-prover.ts';

// 7. Multi-Iteration Healing Orchestrator (Contribution 107)
import { runSelfHealingLoop } from '../src/lib/repair/healing-orchestrator.ts';

// 8. GitHub Pull Request Publisher (Contribution 108)
import {
  formatSelfHealingPrBody,
  publishSelfHealingPullRequest,
} from '../src/lib/repair/github-publisher.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log(' PROOFix Master Self-Healing CI Regression Test Suite            ');
console.log(' Feature: Autonomous Self-Healing & Verified PR Loop (101-110)   ');
console.log('================================================================\n');

async function runMasterSelfHealingSuite() {
  // --------------------------------------------------------------------------
  // Test 1: Self-Healing Policy & Preconditions (Contribution 101)
  // --------------------------------------------------------------------------
  console.log('Test 1: Policy validation, presets, and safety preconditions...');
  {
    const validationResult = validateSelfHealingConfig({
      enabled: true,
      mode: 'semi_autonomous',
      maxIterations: 3,
      minConfidenceScore: 80,
    });
    assert.equal(validationResult.valid, true);
    assert.equal(validationResult.config.enabled, true);
    assert.equal(validationResult.config.mode, 'semi_autonomous');
    assert.equal(validationResult.config.maxIterations, 3);
    assert.equal(validationResult.config.minConfidenceScore, 80);

    // Verify clamping bounds
    const clamped = validateSelfHealingConfig({ maxIterations: 10, minConfidenceScore: 20 });
    assert.equal(clamped.config.maxIterations, 5);
    assert.equal(clamped.config.minConfidenceScore, 50);

    // Verify path eligibility
    const config = getDefaultSelfHealingConfig();
    assert.equal(isPathEligibleForRepair('src/app/checkout/page.tsx', config).eligible, true);
    assert.equal(isPathEligibleForRepair('.env.local', config).eligible, false);
    assert.equal(isPathEligibleForRepair('../outside/malicious.ts', config).eligible, false);

    // Verify proposal eligibility evaluation
    const eligibleProposal = {
      id: 'prop_01',
      projectId: 'proj_01',
      runId: 'run_01',
      failureId: 'fail_01',
      commitSha: 'a1b2c3d',
      explanation: 'Fix missing null check',
      proposedChanges: '--- a/src/app/page.tsx\n+++ b/src/app/page.tsx\n',
      affectedFiles: ['src/app/page.tsx'],
      confidenceScore: 90,
      validationStatus: 'valid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const eligibility = evaluateSelfHealingEligibility(eligibleProposal, {
      ...config,
      enabled: true,
      minConfidenceScore: 80,
    });
    assert.equal(eligibility.allowed, true);
    console.log('  [PASS] Policy engine and precondition security rules verified.');
  }

  // --------------------------------------------------------------------------
  // Test 2: Failure Context Synthesis & Secret Redaction (Contribution 102)
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Context synthesizer and leak-proof secret redaction...');
  {
    const rawSecret = 'ghp_superSecretToken998877665544332211';
    const rawStack = `Error: API Error\n  Authorization: Bearer ${rawSecret}\n  at src/api/client.ts:42:15`;
    const redacted = redactSensitiveData(rawStack);
    assert.ok(!redacted.includes(rawSecret));
    assert.ok(redacted.includes('[REDACTED_SECRET]'));

    const testResult = {
      id: 'test_res_ci_fail',
      runId: 'run_ci_fail_01',
      name: 'Checkout Verification',
      category: 'checkout',
      status: 'failed',
      durationMs: 400,
      actualResult: `Error: fail with key ${rawSecret}`,
      errorDetails: {
        message: `Error with token ${rawSecret}`,
        stack: `Error: fail\n    at d:\\Coding\\PROOFix\\src\\app\\page.tsx:12:4`,
        url: 'https://app.proofix.dev/checkout',
      },
      evidence: {
        consoleErrors: [{ timestamp: new Date().toISOString(), type: 'error', text: `Key: ${rawSecret}` }],
        networkFailures: [{ url: `/api/pay?token=${rawSecret}`, method: 'POST', status: 500 }],
        steps: [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    const ctx = synthesizeFailureContext(testResult, process.cwd());
    assert.equal(ctx.failureId, 'test_res_ci_fail');
    assert.ok(!ctx.errorMessage.includes(rawSecret));
    assert.ok(!ctx.sanitizedStackTrace.includes(rawSecret));
    assert.ok(!ctx.consoleErrors.some((c) => c.includes(rawSecret)));
    assert.ok(!ctx.networkErrors.some((n) => n.includes(rawSecret)));
    console.log('  [PASS] Failure context extraction and zero secret leakage verified.');
  }

  // --------------------------------------------------------------------------
  // Test 3: Surgical Patch Generation Engine (Contribution 103)
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Surgical patch generation and prohibited injection blocking...');
  {
    const oldCode = 'function calc(item: any) {\n  return item.price * 2;\n}\n';
    const newCode = 'function calc(item: any) {\n  return (item?.price ?? 0) * 2;\n}\n';

    const diff = formatUnifiedDiff('src/calc.ts', oldCode, newCode);
    assert.ok(diff.includes('--- a/src/calc.ts'));
    assert.ok(diff.includes('+++ b/src/calc.ts'));
    assert.ok(diff.includes('+  return (item?.price ?? 0) * 2;'));

    // Safe content assertion
    assertSafePatchContent(diff);

    // Dangerous command injection rejection
    const dangerousDiff = '--- a/app.ts\n+++ b/app.ts\n@@ -1,1 +1,1 @@\n+child_process.execSync("rm -rf /");';
    assert.throws(() => {
      assertSafePatchContent(dangerousDiff);
    }, /Security violation/);

    // Generate patch from synthesized failure context
    const context = {
      failureId: 'fail_null_01',
      testName: 'Profile Render',
      category: 'error_boundary',
      errorMessage: 'Cannot read properties of undefined (reading "name")',
      sanitizedStackTrace: '',
      consoleErrors: [],
      networkErrors: [],
      suspectFiles: [
        {
          relativePath: 'src/app/profile/page.tsx',
          absolutePath: '/app/src/app/profile/page.tsx',
          content: 'export default function Profile(props) {\n  return <div>{props.user.name}</div>;\n}',
          targetLine: 2,
        },
      ],
      evidenceSummary: 'Uncaught TypeError on props.user.name',
      synthesizedAt: new Date().toISOString(),
    };

    const proposal = generateSurgicalPatch(context, 'proj_ci', 'run_ci', 'abcdef1');
    assert.ok(proposal.id.startsWith('prop_'));
    assert.equal(proposal.affectedFiles[0], 'src/app/profile/page.tsx');
    assert.ok(proposal.confidenceScore >= 90);
    assert.ok(proposal.proposedChanges.includes('?.'));
    console.log('  [PASS] Surgical patch generation and injection defense verified.');
  }

  // --------------------------------------------------------------------------
  // Test 4: Ephemeral Workspace Isolation & Snapshot Rollback (Contribution 104)
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Ephemeral sandbox provisioning, snapshotting, and atomic rollback...');
  {
    const fixtureRoot = path.join(process.cwd(), 'scratch', 'test_ci_source_app');
    fs.mkdirSync(path.join(fixtureRoot, 'src'), { recursive: true });
    const sampleFilePath = path.join(fixtureRoot, 'src', 'component.tsx');
    fs.writeFileSync(sampleFilePath, 'const value = 1;\n', 'utf8');

    const workspace = await createEphemeralWorkspace(fixtureRoot, 'sess_master_ci_01');
    assert.ok(fs.existsSync(workspace.workspacePath));
    const copiedFile = path.join(workspace.workspacePath, 'src', 'component.tsx');
    assert.ok(fs.existsSync(copiedFile));

    // Create snapshot
    const snapshot = createWorkspaceSnapshot(workspace.workspacePath, ['src/component.tsx']);

    // Mutate file in workspace
    fs.writeFileSync(copiedFile, 'const value = 9999;\n', 'utf8');
    assert.equal(fs.readFileSync(copiedFile, 'utf8'), 'const value = 9999;\n');

    // Rollback snapshot
    rollbackWorkspace(workspace.workspacePath, snapshot);
    assert.equal(fs.readFileSync(copiedFile, 'utf8'), 'const value = 1;\n');

    // Cleanup workspace and fixture
    await cleanupEphemeralWorkspace(workspace.workspacePath);
    assert.ok(!fs.existsSync(workspace.workspacePath));
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    console.log('  [PASS] Ephemeral sandbox deep-copy, snapshotting, and atomic rollback verified.');
  }

  // --------------------------------------------------------------------------
  // Test 5: Atomic Patch Applier & Conflict Rejection (Contribution 105)
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Atomic patch application and conflict rejection...');
  {
    const tempDir = path.join(process.cwd(), 'scratch', 'test_ci_patch_applier');
    fs.mkdirSync(tempDir, { recursive: true });
    const targetFile = path.join(tempDir, 'file.ts');
    fs.writeFileSync(targetFile, 'const x = 10;\nconst y = 20;\nconst z = x + y;\n', 'utf8');

    const validDiff = `--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,3 @@\n const x = 10;\n-const y = 20;\n+const y = 50;\n const z = x + y;\n`;

    // Successful atomic application
    const applierResult = applyPatchAtomically(tempDir, validDiff);
    assert.equal(applierResult.success, true);
    assert.equal(fs.readFileSync(targetFile, 'utf8'), 'const x = 10;\nconst y = 50;\nconst z = x + y;\n');

    // Conflict detection when hunk target does not match
    const mismatchedDiff = `--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,3 @@\n const x = 10;\n-const y = 999999999;\n+const y = 100;\n const z = x + y;\n`;
    const conflictResult = applyPatchAtomically(tempDir, mismatchedDiff);
    assert.equal(conflictResult.success, false);
    assert.ok(conflictResult.conflictErrors.length > 0);
    // Guarantee original file was rolled back
    assert.equal(fs.readFileSync(targetFile, 'utf8'), 'const x = 10;\nconst y = 50;\nconst z = x + y;\n');

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('  [PASS] Atomic patch application and conflict rejection verified.');
  }

  // --------------------------------------------------------------------------
  // Test 6: Post-Patch Verification Prover & Regression Auditing (Contribution 106)
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Post-patch prover and adjacent regression detection...');
  {
    const mockProposal = {
      id: 'prop_ci_prover',
      projectId: 'proj_ci',
      runId: 'run_ci',
      failureId: 'fail_target',
      commitSha: 'c0ffee',
      explanation: 'Fix price access',
      proposedChanges: '--- a/calc.ts\n+++ b/calc.ts\n',
      affectedFiles: ['src/calc.ts'],
      confidenceScore: 88,
      validationStatus: 'valid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Clean run without regressions
    const cleanRunner = {
      runCheck: async (name) => ({ passed: true, message: `Check ${name} passed`, durationMs: 25 }),
    };
    const cleanResult = await provePatchFix(mockProposal, '/tmp/workspace', 'Target Checkout Check', ['Nav Check', 'Auth Check'], cleanRunner);
    assert.equal(cleanResult.outcome, 'verified_fix');
    assert.equal(cleanResult.failingCheckResolved, true);
    assert.equal(cleanResult.regressionsCount, 0);

    // Regressive run detected
    const regressiveRunner = {
      runCheck: async (name) => {
        if (name === 'Auth Check') {
          return { passed: false, message: 'Auth token invalid after patch', durationMs: 40 };
        }
        return { passed: true, message: `Check ${name} passed`, durationMs: 20 };
      },
    };
    const regressiveResult = await provePatchFix(mockProposal, '/tmp/workspace', 'Target Checkout Check', ['Nav Check', 'Auth Check'], regressiveRunner);
    assert.equal(regressiveResult.outcome, 'regression_detected');
    assert.equal(regressiveResult.failingCheckResolved, true);
    assert.equal(regressiveResult.regressionsCount, 1);
    console.log('  [PASS] Post-patch proving and adjacent regression detection verified.');
  }

  // --------------------------------------------------------------------------
  // Test 7: Multi-Iteration Self-Healing Orchestration Loop (Contribution 107)
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Multi-iteration orchestrator convergence...');
  {
    const dummyAppDir = path.join(process.cwd(), 'scratch', 'test_ci_loop_app');
    fs.mkdirSync(path.join(dummyAppDir, 'src', 'app'), { recursive: true });
    const pagePath = path.join(dummyAppDir, 'src', 'app', 'page.tsx');
    fs.writeFileSync(
      pagePath,
      'export default function Page(props: any) {\n  return <div>{props.user.name}</div>;\n}\n',
      'utf8'
    );

    const failingTest = {
      id: 'test_fail_ci_access',
      runId: 'run_ci_01',
      name: 'Root Page Render Check',
      category: 'error_boundary',
      status: 'failed',
      error: 'TypeError: Cannot read properties of undefined (reading "name")\n  at Page (src/app/page.tsx:2:32)',
    };

    const passingRunner = {
      runCheck: async () => ({ passed: true, message: 'All checks passed cleanly', durationMs: 25 }),
    };

    const runResult = await runSelfHealingLoop(
      failingTest,
      dummyAppDir,
      'proj_ci_01',
      'run_ci_01',
      'commit123',
      ['Header Check'],
      passingRunner,
      { enabled: true, mode: 'semi_autonomous', maxIterations: 2 }
    );

    assert.equal(runResult.converged, true);
    assert.equal(runResult.session.runId, 'run_ci_01');
    assert.equal(runResult.session.projectId, 'proj_ci_01');
    assert.equal(runResult.session.status, 'completed');
    assert.equal(runResult.session.finalOutcome, 'verified_fix');
    assert.ok(runResult.session.iterations.length >= 1);
    assert.equal(runResult.session.iterations[0].verificationStatus, 'passed');

    // Clean up active workspace if present
    if (runResult.session.activeWorkspacePath) {
      await cleanupEphemeralWorkspace(runResult.session.activeWorkspacePath);
    }

    // Clean up scratch app
    fs.rmSync(dummyAppDir, { recursive: true, force: true });
    console.log('  [PASS] Multi-iteration healing convergence loop verified.');
  }

  // --------------------------------------------------------------------------
  // Test 8: GitHub PR Publisher & Secret Protection (Contribution 108)
  // --------------------------------------------------------------------------
  console.log('\nTest 8: GitHub PR body synthesis and mock publisher...');
  {
    const session = {
      id: 'heal_sess_master_108',
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
          diffSummary: 'Add accessible label to submit button',
          verificationStatus: 'passed',
          verificationDurationMs: 950,
          failingChecksResolved: ['Form Submit Verification'],
          newFailuresIntroduced: [],
          diagnostics: 'Clean pass with 0 regressions',
          timestamp: new Date().toISOString(),
        },
      ],
      gitBranch: 'proofix/heal-run_108-fix',
      finalOutcome: 'verified_fix',
      logs: [
        'Sandbox initialized at data/workspaces/heal_sess_master_108',
        'Sensitive key ghp_secretkey998877665544332211 redacted from traces',
        'Verification passed cleanly',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const proposal = {
      id: 'prop_ci_pr',
      projectId: 'proj_108',
      runId: 'run_108',
      failureId: 'fail_missing_btn',
      commitSha: 'a1b2c3d',
      explanation: 'Add accessible label to submit button',
      proposedChanges: '--- a/btn.tsx\n+++ b/btn.tsx\n@@ -1,2 +1,2 @@\n-<button>\n+<button aria-label="Submit">\n',
      affectedFiles: ['src/components/btn.tsx'],
      confidenceScore: 92,
      validationStatus: 'valid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const prBody = formatSelfHealingPrBody(session, proposal, 'run_108', {
      reportUrl: 'https://proofix.dev/reports/run_108',
    });
    assert.ok(prBody.includes('PROOFix Autonomous Self-Healing Verification Proof'));
    assert.ok(prBody.includes('Add accessible label to submit button'));
    assert.ok(prBody.includes('fail_missing_btn'));
    assert.ok(prBody.includes('VERIFIED FIX'));

    const mockFetch = async (url, init) => {
      if (url.includes('/git/refs')) {
        return new Response(JSON.stringify({ ref: 'refs/heads/proofix/heal-branch' }), { status: 201 });
      }
      if (url.includes('/pulls')) {
        return new Response(
          JSON.stringify({
            number: 108,
            html_url: 'https://github.com/debangshuuii/PROOFix/pull/108',
          }),
          { status: 201 }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const mockPrResult = await publishSelfHealingPullRequest(session, proposal, {
      repoOwner: 'debangshuuii',
      repoName: 'PROOFix',
      token: 'ghp_fakeToken12345678901234567890',
      mockApiFetch: mockFetch,
    });

    assert.equal(mockPrResult.success, true);
    assert.equal(mockPrResult.pullRequestNumber, 108);
    assert.equal(mockPrResult.pullRequestUrl, 'https://github.com/debangshuuii/PROOFix/pull/108');
    console.log('  [PASS] GitHub PR body synthesis and publication flow verified.');
  }

  // --------------------------------------------------------------------------
  // Test 9: Self-Healing Dashboard UI Component (Contribution 109)
  // --------------------------------------------------------------------------
  console.log('\nTest 9: SelfHealingDashboard component & Run Page integration...');
  {
    const compPath = path.join(__dirname, '..', 'src', 'components', 'repair', 'SelfHealingDashboard.tsx');
    assert.ok(fs.existsSync(compPath), 'SelfHealingDashboard.tsx exists');
    const compCode = fs.readFileSync(compPath, 'utf8');
    assert.ok(compCode.includes('SelfHealingDashboard'));
    assert.ok(compCode.includes('Self-Healing Execution Pipeline'));
    assert.ok(compCode.includes('Approve Fix'));

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'projects', '[id]', 'runs', '[runId]', 'page.tsx');
    assert.ok(fs.existsSync(pagePath), 'Run page.tsx exists');
    const pageCode = fs.readFileSync(pagePath, 'utf8');
    assert.ok(pageCode.includes("import { SelfHealingDashboard } from '@/components/repair/SelfHealingDashboard'"));
    assert.ok(pageCode.includes("'self-healing'"));
    assert.ok(pageCode.includes("<SelfHealingDashboard />"));
    console.log('  [PASS] UI component and verification run tab integration verified.');
  }

  // --------------------------------------------------------------------------
  // Test 10: Master CI & Documentation Invariants (Contribution 110)
  // --------------------------------------------------------------------------
  console.log('\nTest 10: Package script registration and technical documentation...');
  {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.ok(pkgJson.scripts['test:self-healing'], 'package.json must register "test:self-healing"');

    const docPath = path.join(__dirname, '..', 'docs', 'AUTONOMOUS_SELF_HEALING_PR_LOOP.md');
    assert.ok(fs.existsSync(docPath), 'docs/AUTONOMOUS_SELF_HEALING_PR_LOOP.md must exist');
    console.log('  [PASS] Master CI scripts and architectural documentation verified.');
  }

  console.log('\n================================================================');
  console.log(' [SUCCESS] ALL 10 SELF-HEALING REGRESSION SUITES PASSED!       ');
  console.log(' Point 1 (Contributions 101–110) Fully Verified.               ');
  console.log('================================================================');
}

runMasterSelfHealingSuite().catch((err) => {
  console.error('\n[FAIL] Self-Healing CI Regression Suite failed:', err);
  process.exit(1);
});
