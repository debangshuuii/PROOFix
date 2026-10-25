import assert from 'node:assert';
import { parseArgs } from '../src/lib/cli/dispatcher.ts';

console.log('[TEST] CLI argument parser for mcp and prove');
const p1 = parseArgs(['mcp']);
assert.strictEqual(p1.command, 'mcp');

const p2 = parseArgs(['prove', '--scenario', 'ecommerce_checkout', '--json']);
assert.strictEqual(p2.command, 'prove');
assert.strictEqual(p2.flags.scenario, 'ecommerce_checkout');
assert.strictEqual(p2.flags.json, true);
console.log('✓ CLI mcp and prove dispatch test passed.');
