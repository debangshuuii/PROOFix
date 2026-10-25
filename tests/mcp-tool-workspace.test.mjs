import assert from 'node:assert';
import { handleVerifyWorkspaceTool } from '../src/lib/mcp/tools/workspace-tool.ts';

console.log('[TEST] proofix_verify_workspace MCP tool');
const res = await handleVerifyWorkspaceTool({ profile: 'smoke' });
const json = JSON.parse(res.content[0].text);
assert(json.runId.startsWith('run_mcp_'));
assert.strictEqual(json.summary.totalChecks, 6);
console.log('✓ proofix_verify_workspace tool test passed.');
