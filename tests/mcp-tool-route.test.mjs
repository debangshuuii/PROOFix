import assert from 'node:assert';
import { handleRunRouteTool } from '../src/lib/mcp/tools/route-tool.ts';

console.log('[TEST] proofix_run_route MCP tool');
const pass = await handleRunRouteTool({ route: '/about' });
assert.strictEqual(pass.isError, false);

const fail = await handleRunRouteTool({ route: '/broken-page' });
assert.strictEqual(fail.isError, true);
console.log('✓ proofix_run_route tool test passed.');
