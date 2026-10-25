import assert from 'node:assert';
import { McpRequestValidator } from '../src/lib/mcp/validator.ts';

console.log('[TEST] McpRequestValidator');
const valid = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
assert.deepStrictEqual(McpRequestValidator.validate(valid), valid);

assert.throws(() => {
  McpRequestValidator.validate({ jsonrpc: '1.0', method: 'ping' });
}, /Invalid jsonrpc version/);
console.log('✓ McpRequestValidator unit test passed.');
