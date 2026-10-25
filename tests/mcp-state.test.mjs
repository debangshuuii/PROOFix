import assert from 'node:assert';
import { McpProtocolState } from '../src/lib/mcp/state.ts';

console.log('[TEST] McpProtocolState lifecycle');
const state = new McpProtocolState();
assert.strictEqual(state.isInitialized(), false);

state.handleInitialize({ name: 'Cursor-Agent', version: '1.2.0' });
assert.strictEqual(state.isInitialized(), false);
assert.strictEqual(state.getClientInfo().name, 'Cursor-Agent');

state.handleInitialized();
assert.strictEqual(state.isInitialized(), true);
console.log('✓ McpProtocolState unit test passed.');
