import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { db } from '../src/lib/db/index.ts';

test('Next.js SSR Hydration Drift End-to-End Simulation Workflow', async () => {
  // 1. Launch scenario
  const launch = await PlaygroundEngine.launchDemoRun('hydration_mismatch');
  assert.equal(launch.success, true);
  assert.equal(launch.scenarioId, 'hydration_mismatch');

  // 2. Verify failure findings
  const findings = await db.getFindings(launch.runId);
  assert.ok(findings.length > 0);
  const hydrationFinding = findings.find((f) => f.type === 'hydration_mismatch');
  assert.ok(hydrationFinding);
  assert.ok(hydrationFinding.title.includes('Error #418'));

  // 3. Apply fix
  const fix = await PlaygroundEngine.applyDemoFix('hydration_mismatch', launch.runId);
  assert.equal(fix.success, true);
  assert.equal(fix.patchApplied, true);

  // 4. Verify post-fix state
  const verifiedFindings = await db.getFindings(fix.verifiedRunId);
  assert.equal(verifiedFindings.length, 0);

  const verifiedRun = await db.getRunById(fix.verifiedRunId);
  assert.ok(verifiedRun);
  assert.equal(verifiedRun.status, 'completed');
  assert.ok(verifiedRun.logs?.some((l) => l.includes('ALL TESTS GREEN')));
});
