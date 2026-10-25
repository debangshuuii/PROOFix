import assert from 'node:assert';
import { JsonRpcMessageParser } from '../src/lib/mcp/parser.ts';

console.log('[TEST] JsonRpcMessageParser');
const parser = new JsonRpcMessageParser();

const chunk1 = '{"jsonrpc":"2.0","id":1,"method":"ping"}\n';
const res1 = parser.append(chunk1);
assert.strictEqual(res1.length, 1);
assert.strictEqual(res1[0].method, 'ping');

// Partial buffering
const p1 = '{"jsonrpc":"2.0",';
const p2 = '"id":2,"method":"initialize"}\n';
assert.strictEqual(parser.append(p1).length, 0);
const res2 = parser.append(p2);
assert.strictEqual(res2.length, 1);
assert.strictEqual(res2[0].method, 'initialize');
console.log('✓ JsonRpcMessageParser unit test passed.');
