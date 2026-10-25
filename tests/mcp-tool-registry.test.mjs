import assert from 'node:assert';
import { McpToolRegistry } from '../src/lib/mcp/tool-registry.ts';

console.log('[TEST] McpToolRegistry');
const reg = new McpToolRegistry();

reg.register({
  name: 'test_tool',
  description: 'A test tool',
  inputSchema: { type: 'object', properties: { count: { type: 'number' } } }
}, async (params) => {
  return { content: [{ type: 'text', text: 'Result: ' + params.count }] };
});

assert.strictEqual(reg.has('test_tool'), true);
assert.strictEqual(reg.listTools().length, 1);

const res = await reg.execute('test_tool', { count: 42 });
assert.strictEqual(res.content[0].text, 'Result: 42');
console.log('✓ McpToolRegistry unit test passed.');
