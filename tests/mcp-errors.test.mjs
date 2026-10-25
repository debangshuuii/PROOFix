import assert from 'node:assert';
import { JsonRpcError } from '../src/lib/mcp/errors.ts';

console.log('[TEST] JsonRpcError serialization');
const err = JsonRpcError.methodNotFound('unknown/method');
assert.strictEqual(err.code, -32601);
assert.strictEqual(err.message, 'Method not found: unknown/method');

const obj = err.toObject();
assert.strictEqual(obj.code, -32601);
assert.strictEqual(obj.message, 'Method not found: unknown/method');

const customErr = new JsonRpcError(-32000, 'Tool execution error', { details: 'Timeout' });
assert.deepStrictEqual(customErr.toObject(), {
  code: -32000,
  message: 'Tool execution error',
  data: { details: 'Timeout' }
});
console.log('✓ JsonRpcError unit test passed.');
