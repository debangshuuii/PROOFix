import assert from 'node:assert';
import { PROVER_SCENARIOS } from '../src/lib/prover/scenarios.ts';

console.log('[TEST] Prover Scenarios');
assert.strictEqual(PROVER_SCENARIOS.length, 3);
assert.strictEqual(PROVER_SCENARIOS[0].id, 'ecommerce_checkout');
console.log('✓ Prover Scenarios test passed.');
