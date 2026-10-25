import assert from 'node:assert';
import { McpResourceRegistry } from '../src/lib/mcp/resource-registry.ts';

console.log('[TEST] McpResourceRegistry');
const reg = new McpResourceRegistry();

reg.register({
  uri: 'proofix://info',
  name: 'System Info',
  mimeType: 'application/json'
}, async (uri) => {
  return { uri, mimeType: 'application/json', text: '{"status":"ok"}' };
});

assert.strictEqual(reg.listResources().length, 1);
const r = await reg.read('proofix://info');
assert.strictEqual(r.text, '{"status":"ok"}');
console.log('✓ McpResourceRegistry unit test passed.');
