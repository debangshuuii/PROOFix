import test from 'node:test';
import assert from 'node:assert/strict';
import { CliPipelineExecutor } from '../src/lib/cli/runner/pipeline.ts';

test('pipeline-executor: runs 11-stage pipeline against ecommerce_checkout scenario', async () => {
  const executor = new CliPipelineExecutor();
  const stagesStarted = [];
  const stagesCompleted = [];

  const result = await executor.execute(
    { scenario: 'ecommerce_checkout' },
    {
      onStageStart: (id) => stagesStarted.push(id),
      onStageComplete: (id, status) => stagesCompleted.push({ id, status }),
    }
  );

  assert.equal(result.stages.length, 11);
  assert.equal(stagesStarted.length, 11);
  assert.equal(stagesCompleted.length, 11);
  assert.equal(result.scenarioId, 'ecommerce_checkout');
  assert.equal(result.status, 'failed'); // Benchmark defect detected in action simulation

  const actionStage = result.stages.find((s) => s.id === 'action_simulation');
  assert.equal(actionStage?.status, 'failed');
  assert.ok(actionStage?.logs.some((l) => l.includes('404')));
});

test('pipeline-executor: runs against sql_injection_preflight detecting security gate failure', async () => {
  const executor = new CliPipelineExecutor();
  const result = await executor.execute({ scenario: 'sql_injection_preflight' });

  assert.equal(result.scenarioId, 'sql_injection_preflight');
  const secStage = result.stages.find((s) => s.id === 'security_gate');
  assert.equal(secStage?.status, 'failed');
  assert.ok(secStage?.description.includes('SQL Injection'));
});

test('pipeline-executor: bail option terminates execution early on first failure', async () => {
  const executor = new CliPipelineExecutor();
  const result = await executor.execute({ scenario: 'ecommerce_checkout', bail: true });

  // action_simulation is stage index 2 (third stage)
  assert.ok(result.stages.length <= 4);
  assert.ok(result.skippedCount > 0);
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
