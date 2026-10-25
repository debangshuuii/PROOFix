import assert from 'node:assert';
import { MultiIterationSelfHealer } from '../src/lib/prover/self-healer.ts';

console.log('[TEST] MultiIterationSelfHealer');
const prompt = MultiIterationSelfHealer.synthesizeRefinementPrompt('404 Missing Route', 'Button onClick exception', 2);
assert(prompt.includes('ITERATION 2'));
assert(prompt.includes('Button onClick exception'));
console.log('✓ MultiIterationSelfHealer test passed.');
