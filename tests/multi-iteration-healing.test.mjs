import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runSelfHealingLoop } from '../src/lib/repair/healing-orchestrator.ts';
import { cleanupEphemeralWorkspace } from '../src/lib/repair/ephemeral-workspace.ts';

console.log('--- Testing Multi-Iteration Self-Healing Loop & Convergence Bounds (Contribution 7 / 107) ---');

async function testSelfHealingLoopExecution() {
  const dummyAppDir = path.join(process.cwd(), 'scratch', 'test_heal_loop_app');
  fs.mkdirSync(path.join(dummyAppDir, 'src', 'app'), { recursive: true });

  const pagePath = path.join(dummyAppDir, 'src', 'app', 'page.tsx');
  fs.writeFileSync(
    pagePath,
    'export default function Page(props: any) {\n  return <div>{props.user.name}</div>;\n}\n',
    'utf8'
  );

  const failingTest = {
    id: 'test_fail_prop_access',
    runId: 'run_heal_01',
    name: 'Root Page Render Check',
    category: 'error_boundary',
    status: 'failed',
    durationMs: 300,
    actualResult: 'Cannot read properties of undefined (reading "name")',
    errorDetails: {
      message: 'Cannot read properties of undefined (reading "name")',
      stack: `TypeError: Cannot read properties of undefined\n    at Page (${pagePath}:2:15)`,
      url: 'https://app.proofix.dev/',
    },
    evidence: {
      consoleErrors: [],
      networkFailures: [],
      steps: [],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  try {
    // 1. First Run: Converges on Iteration 1
    const passingRunner = {
      runCheck: async () => ({ passed: true, message: 'All checks passed cleanly', durationMs: 25 }),
    };

    const runResult1 = await runSelfHealingLoop(
      failingTest,
      dummyAppDir,
      'proj_heal_01',
      'run_heal_01',
      'commit123',
      ['Smoke Navigation'],
      passingRunner,
      { enabled: true, mode: 'semi_autonomous', maxIterations: 3 }
    );

    assert.equal(runResult1.converged, true);
    assert.equal(runResult1.session.status, 'completed');
    assert.equal(runResult1.session.finalOutcome, 'verified_fix');
    assert.equal(runResult1.session.currentIteration, 1);
    assert.equal(runResult1.session.iterations.length, 1);
    assert.ok(runResult1.finalPatchDiff);
    console.log('[PASS] Self-healing loop successfully converges on iteration 1 when patch passes.');

    // Cleanup workspace from first run
    if (runResult1.session.activeWorkspacePath) {
      await cleanupEphemeralWorkspace(runResult1.session.activeWorkspacePath);
    }

    // 2. Second Run: Refines across 2 iterations
    let attemptCount = 0;
    const progressiveRunner = {
      runCheck: async (name) => {
        attemptCount++;
        // Attempt 1: Target passes, but regression check fails
        if (attemptCount === 1) {
          return { passed: true, message: 'Target passed', durationMs: 20 };
        }
        if (attemptCount === 2) {
          // Regression check in iteration 1 fails!
          return { passed: false, message: 'Smoke check broke', durationMs: 20 };
        }
        // Iteration 2: All pass!
        return { passed: true, message: 'Clean pass', durationMs: 20 };
      },
    };

    const runResult2 = await runSelfHealingLoop(
      failingTest,
      dummyAppDir,
      'proj_heal_01',
      'run_heal_01',
      'commit123',
      ['Smoke Navigation'],
      progressiveRunner,
      { enabled: true, mode: 'semi_autonomous', maxIterations: 3 }
    );

    assert.equal(runResult2.converged, true);
    assert.equal(runResult2.session.currentIteration, 2);
    assert.equal(runResult2.session.iterations.length, 2);
    assert.equal(runResult2.session.iterations[0].verificationStatus, 'regression');
    assert.equal(runResult2.session.iterations[1].verificationStatus, 'passed');
    console.log('[PASS] Multi-iteration healing loop successfully recovers from regression on iteration 2.');

    if (runResult2.session.activeWorkspacePath) {
      await cleanupEphemeralWorkspace(runResult2.session.activeWorkspacePath);
    }

    // 3. Third Run: Exhausts maxIterations without infinite loop
    const alwaysFailingRunner = {
      runCheck: async () => ({ passed: false, message: 'Unresolved persistent bug', durationMs: 15 }),
    };

    const runResult3 = await runSelfHealingLoop(
      failingTest,
      dummyAppDir,
      'proj_heal_01',
      'run_heal_01',
      'commit123',
      ['Smoke Navigation'],
      alwaysFailingRunner,
      { enabled: true, mode: 'semi_autonomous', maxIterations: 2 }
    );

    assert.equal(runResult3.converged, false);
    assert.equal(runResult3.session.status, 'failed');
    assert.equal(runResult3.session.finalOutcome, 'unfixable');
    assert.equal(runResult3.session.currentIteration, 2);
    assert.equal(runResult3.session.iterations.length, 2);
    console.log('[PASS] Bounded iterations enforced: terminates safely when maxIterations is exhausted.');
  } finally {
    fs.rmSync(dummyAppDir, { recursive: true, force: true });
  }
}

async function runSuite() {
  await testSelfHealingLoopExecution();
  console.log('[ALL PASS] Contribution 7 (107) test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] Multi-iteration healing test error:', err);
  process.exit(1);
});
