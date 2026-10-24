import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { db } from '../src/lib/db/index.ts';

test('SQL Injection Preflight Gate End-to-End Simulation Workflow', async () => {
  // 1. Launch scenario
  const launch = await PlaygroundEngine.launchDemoRun('sql_injection_preflight');
  assert.equal(launch.success, true);
  assert.equal(launch.scenarioId, 'sql_injection_preflight');

  // 2. Verify security gate blocker
  const tests = await db.getTestResults(launch.runId);
  const gateTest = tests.find((t) => t.category === 'security' && t.status === 'failed');
  assert.ok(gateTest, 'Security gate test must fail');
  assert.ok(gateTest.errorMessage?.includes('CWE-89'));

  const blockedRuntimeTest = tests.find((t) => t.status === 'blocked');
  assert.ok(blockedRuntimeTest, 'Runtime execution must be blocked');

  // 3. Apply parameterized fix
  const fix = await PlaygroundEngine.applyDemoFix('sql_injection_preflight', launch.runId);
  assert.equal(fix.success, true);
  assert.equal(fix.status, 'passed');

  // 4. Verify post-fix security clearance
  const verifiedTests = await db.getTestResults(fix.verifiedRunId);
  assert.ok(verifiedTests.every((t) => t.status === 'passed'), 'All security gates must pass');

  const verifiedRun = await db.getRunById(fix.verifiedRunId);
  assert.equal(verifiedRun?.status, 'completed');
});
