import test from 'node:test';
import assert from 'node:assert/strict';
import { ScenarioRegistry } from '../src/lib/playground/registry.ts';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';

test('ScenarioRegistry lists all 3 demo scenarios by default', () => {
  const scenarios = ScenarioRegistry.listScenarios();
  assert.equal(scenarios.length, 3);
  const ids = scenarios.map((s) => s.id);
  assert.ok(ids.includes('ecommerce_checkout'));
  assert.ok(ids.includes('hydration_mismatch'));
  assert.ok(ids.includes('sql_injection_preflight'));
});

test('ScenarioRegistry filters scenarios by category', () => {
  const security = ScenarioRegistry.listScenarios('security_preflight');
  assert.equal(security.length, 1);
  assert.equal(security[0].id, 'sql_injection_preflight');

  const react = ScenarioRegistry.listScenarios('framework_react');
  assert.equal(react.length, 1);
  assert.equal(react[0].id, 'hydration_mismatch');
});

test('ScenarioRegistry searches scenarios by text keyword', () => {
  const results = ScenarioRegistry.listScenarios('all', 'checkout');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'ecommerce_checkout');
});

test('PlaygroundEngine provisions scenario and saves to database', async () => {
  const { project, run, scenario } = await PlaygroundEngine.provisionScenario('ecommerce_checkout');
  assert.ok(project);
  assert.equal(project.id, 'prj-demo-ecommerce-checkout');
  assert.equal(run.status, 'failed');
  assert.equal(scenario.id, 'ecommerce_checkout');
});

test('PlaygroundEngine launches a demo run producing a valid runId and runUrl', async () => {
  const res = await PlaygroundEngine.launchDemoRun('hydration_mismatch');
  assert.equal(res.success, true);
  assert.equal(res.scenarioId, 'hydration_mismatch');
  assert.ok(res.runId.startsWith('run-demo-hydration-mismatch-live-'));
  assert.ok(res.runUrl.includes('/runs/'));
});

test('PlaygroundEngine applies demo fix generating 100% passed verified run', async () => {
  const launch = await PlaygroundEngine.launchDemoRun('sql_injection_preflight');
  const fix = await PlaygroundEngine.applyDemoFix('sql_injection_preflight', launch.runId);

  assert.equal(fix.success, true);
  assert.equal(fix.patchApplied, true);
  assert.equal(fix.testsFailed, 0);
  assert.equal(fix.status, 'passed');
  assert.ok(fix.verifiedRunUrl.includes('/runs/'));
});
