import assert from 'node:assert';
import { McpServer } from '../src/lib/mcp/server.ts';

console.log('[TEST] McpServer core methods');
const server = new McpServer();

const initRes = await server.handleRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { clientInfo: { name: 'TestClient', version: '1.0' } }
});

assert.strictEqual(initRes.id, 1);
assert.strictEqual(initRes.result.serverInfo.name, 'proofix-mcp-server');

const pingRes = await server.handleRequest({ jsonrpc: '2.0', id: 2, method: 'ping' });
assert.deepStrictEqual(pingRes.result, {});
console.log('✓ McpServer core tests passed.');
