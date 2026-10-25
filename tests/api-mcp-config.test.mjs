import assert from 'node:assert';
import { GET } from '../src/app/api/v1/mcp/config/route.ts';

console.log('[TEST] /api/v1/mcp/config route');
const reqClaude = new Request('http://localhost/api/v1/mcp/config');
const resClaude = await GET(reqClaude);
const jsonClaude = await resClaude.json();
assert(jsonClaude.mcpServers.proofix !== undefined);

const reqCursor = new Request('http://localhost/api/v1/mcp/config?format=cursor');
const resCursor = await GET(reqCursor);
const jsonCursor = await resCursor.json();
assert(jsonCursor.cursor.proofix !== undefined);
console.log('✓ /api/v1/mcp/config test passed.');
