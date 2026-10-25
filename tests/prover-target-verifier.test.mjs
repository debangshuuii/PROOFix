import assert from 'node:assert';
import { TargetTestVerifier } from '../src/lib/prover/target-verifier.ts';

console.log('[TEST] TargetTestVerifier');
const res = await TargetTestVerifier.verifyTargetDefect('ecommerce_checkout', '/tmp/shadow');
assert.strictEqual(res.passed, true);
assert.strictEqual(res.httpStatus, 200);
console.log('✓ TargetTestVerifier test passed.');
