import assert from 'node:assert';
import { McpStdioTransport } from '../src/lib/mcp/transport.ts';

console.log('[TEST] McpStdioTransport');
const transport = new McpStdioTransport();
assert(typeof transport.start === 'function');
assert(typeof transport.send === 'function');
console.log('✓ McpStdioTransport structure validated.');
