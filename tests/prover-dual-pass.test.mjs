import assert from 'node:assert';
import { DualPassOrchestrator } from '../src/lib/prover/dual-pass-orchestrator.ts';

console.log('[TEST] DualPassOrchestrator');
const res = await DualPassOrchestrator.executeProof({ scenarioId: 'ecommerce_checkout' });
assert.strictEqual(res.status, 'PROVEN');
assert(res.certificate !== undefined);
assert.strictEqual(res.certificate.status, 'PROVEN');
console.log('✓ DualPassOrchestrator test passed.');
