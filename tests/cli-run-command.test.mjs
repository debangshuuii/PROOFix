import test from 'node:test';
import assert from 'node:assert/strict';
import { executeRunCommand } from '../src/lib/cli/commands/run.ts';

test('run-command: executes ecommerce_checkout in json mode', async () => {
  const result = await executeRunCommand({
    scenario: 'ecommerce_checkout',
    json: true,
  });

  assert.ok(result);
  assert.ok(result.runId);
  assert.equal(result.scenarioId, 'ecommerce_checkout');
  assert.equal(result.stages.length, 11);
  assert.equal(result.status, 'failed');
  assert.ok(result.totalDurationMs >= 0);
});

test('run-command: executes hydration_mismatch scenario', async () => {
  const result = await executeRunCommand({
    scenario: 'hydration_mismatch',
    json: true,
  });

  assert.equal(result.scenarioId, 'hydration_mismatch');
  assert.equal(result.stages.length, 11);
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
