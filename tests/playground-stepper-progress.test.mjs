import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYGROUND_SIMULATION_STAGES } from '../src/lib/playground/constants.ts';

test('PLAYGROUND_SIMULATION_STAGES progress increments deterministically', () => {
  assert.equal(PLAYGROUND_SIMULATION_STAGES.length, 11);

  for (let i = 0; i < PLAYGROUND_SIMULATION_STAGES.length; i++) {
    const pct = Math.min(100, ((i + 1) / PLAYGROUND_SIMULATION_STAGES.length) * 100);
    assert.ok(pct > 0 && pct <= 100);
  }
});
