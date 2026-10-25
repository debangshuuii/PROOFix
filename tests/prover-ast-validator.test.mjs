import assert from 'node:assert';
import { AstPatchValidator } from '../src/lib/prover/ast-validator.ts';

console.log('[TEST] AstPatchValidator');
const valid = AstPatchValidator.validateContent('function test() { return 1; }', 'test.ts');
assert.strictEqual(valid.valid, true);

const invalid = AstPatchValidator.validateContent('function test() { return 1;', 'test.ts');
assert.strictEqual(invalid.valid, false);
assert(invalid.error.includes('Mismatched curly braces'));
console.log('✓ AstPatchValidator test passed.');
