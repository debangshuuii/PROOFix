import assert from 'node:assert';
import { RegressionVerifier } from '../src/lib/prover/regression-verifier.ts';

console.log('[TEST] RegressionVerifier');
const reg = await RegressionVerifier.runBaselineRegressionSuite('/tmp/shadow');
assert.strictEqual(reg.passed, true);
assert.strictEqual(reg.passRate, 1.0);
assert.strictEqual(reg.results.length, 4);
console.log('✓ RegressionVerifier test passed.');
