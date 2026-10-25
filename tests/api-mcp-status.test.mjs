import assert from 'node:assert';
import { GET } from '../src/app/api/v1/mcp/status/route.ts';

console.log('[TEST] /api/v1/mcp/status route');
const res = await GET();
const json = await res.json();
assert.strictEqual(json.status, 'online');
assert.strictEqual(json.protocolVersion, '2024-11-05');
assert.strictEqual(json.toolsCount, 7);
console.log('✓ /api/v1/mcp/status test passed.');
