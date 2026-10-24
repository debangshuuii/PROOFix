import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { ScenarioRegistry } from '../src/lib/playground/registry.ts';

test('ScenarioRegistry handles non-existent scenario queries gracefully', () => {
  const result = ScenarioRegistry.getScenarioById('non_existent_scenario');
  assert.equal(result, null);
  assert.equal(ScenarioRegistry.hasScenario('non_existent_scenario'), false);
});

test('PlaygroundEngine throws helpful error for non-existent scenario launch', async () => {
  await assert.rejects(
    async () => {
      await PlaygroundEngine.launchDemoRun('invalid_scenario_slug');
    },
    {
      message: /Demo scenario not found: invalid_scenario_slug/,
    }
  );
});

test('PlaygroundEngine throws helpful error for non-existent scenario fix application', async () => {
  await assert.rejects(
    async () => {
      await PlaygroundEngine.applyDemoFix('invalid_scenario_slug', 'run_123');
    },
    {
      message: /Demo scenario not found: invalid_scenario_slug/,
    }
  );
});

test('ScenarioRegistry search with special characters does not throw', () => {
  const results = ScenarioRegistry.listScenarios('all', '@#$%^&*()_+');
  assert.equal(results.length, 0);
});
