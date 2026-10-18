import assert from 'assert';
import { db } from '../src/lib/db/index.ts';
import {
  setProjectBaseline,
  replaceProjectBaseline,
  getActiveProjectBaseline,
  getProjectBaselineHistory,
  clearBaselineStore,
} from '../src/lib/comparison/baseline-manager.ts';

console.log('--- TEST: Baseline Selection, Replacement & History ---');

async function runTests() {
  await clearBaselineStore();
  const projectId = 'proj_fixture_01';

  // Test 1: Fallback initial baseline from project runs
  console.log('[TEST 1] Initial active baseline fallback');
  const initial = await getActiveProjectBaseline(projectId);
  assert.ok(initial, 'Initial baseline should resolve from existing completed runs');
  assert.strictEqual(initial.projectId, projectId);
  assert.strictEqual(initial.isActive, true);
  console.log(`  -> Initial baseline resolved to run ${initial.runId} (#${initial.runNumber})`);

  // Create two synthetic runs in DB for testing selection and replacement
  const completedRun = {
    id: 'run_test_completed_42',
    projectId,
    projectVersionId: 'ver_fixture_01',
    runNumber: 42,
    status: 'completed',
    buildStatus: 'success',
    startupStatus: 'success',
    startedAt: new Date(Date.now() - 100000).toISOString(),
    completedAt: new Date(Date.now() - 90000).toISOString(),
    durationMs: 10000,
    commitHash: 'commit_42_abcdef',
    branch: 'main',
    executionConfig: {
      isolationMode: 'local_process_sandbox',
      port: 4173,
      timeoutMs: 30000,
    },
    isolationDisclaimer: 'Test disclaimer',
    summary: { total: 4, passed: 4, failed: 0, blocked: 0, skipped: 0, inconclusive: 0 },
    logs: ['Run finished cleanly'],
    createdAt: new Date().toISOString(),
  };

  const failedRun = {
    ...completedRun,
    id: 'run_test_failed_43',
    runNumber: 43,
    status: 'failed',
    summary: { total: 4, passed: 1, failed: 3, blocked: 0, skipped: 0, inconclusive: 0 },
  };

  await db.createRun(completedRun);
  await db.createRun(failedRun);

  // Test 2: Reject non-completed run as baseline
  console.log('[TEST 2] Rejects setting failed/incomplete run as baseline');
  await assert.rejects(
    async () => {
      await setProjectBaseline(projectId, 'run_test_failed_43');
    },
    /Only successfully "completed" runs may serve as visual baselines/,
    'Failed run must not be accepted as baseline'
  );
  console.log('  -> Safely rejected failed run from becoming baseline.');

  // Test 3: Set valid completed run as baseline
  console.log('[TEST 3] Designate completed run #42 as active baseline');
  const record42 = await setProjectBaseline(projectId, 'run_test_completed_42', {
    setBy: 'Senior QA Engineer',
    reason: 'Approved release candidate build 42 as official benchmark.',
  });

  assert.strictEqual(record42.runId, 'run_test_completed_42');
  assert.strictEqual(record42.runNumber, 42);
  assert.strictEqual(record42.commitHash, 'commit_42_abcdef');
  assert.strictEqual(record42.isActive, true);
  assert.strictEqual(record42.setBy, 'Senior QA Engineer');
  assert.strictEqual(record42.approvalStatus, 'approved');
  console.log('  -> Successfully set run #42 as active baseline.');

  // Test 4: Replace baseline with another completed run
  console.log('[TEST 4] Replace active baseline with run #44');
  const completedRun44 = {
    ...completedRun,
    id: 'run_test_completed_44',
    runNumber: 44,
    commitHash: 'commit_44_fedcba',
  };
  await db.createRun(completedRun44);

  const replacement = await replaceProjectBaseline(projectId, 'run_test_completed_44', {
    setBy: 'Release Manager',
    reason: 'Promoted release 44 with new dashboard layout.',
  });

  assert.strictEqual(replacement.previous?.runId, 'run_test_completed_42');
  assert.strictEqual(replacement.current.runId, 'run_test_completed_44');
  assert.strictEqual(replacement.current.isActive, true);
  console.log('  -> Successfully replaced baseline #42 with #44.');

  // Test 5: Verify baseline history and status
  console.log('[TEST 5] Verify baseline history audit trail');
  const history = await getProjectBaselineHistory(projectId);
  assert.ok(history.length >= 2, 'History should contain multiple records');

  const activeBaseline = await getActiveProjectBaseline(projectId);
  assert.strictEqual(activeBaseline?.runId, 'run_test_completed_44');

  const supersededRecord = history.find((r) => r.runId === 'run_test_completed_42');
  assert.ok(supersededRecord);
  assert.strictEqual(supersededRecord.isActive, false, 'Previous baseline must be marked inactive');
  assert.strictEqual(supersededRecord.approvalStatus, 'superseded');

  console.log(`  -> Audit trail recorded ${history.length} baseline transitions.`);
  console.log('\n--- All Contribution 12 Baseline Selection Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
