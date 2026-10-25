import assert from 'node:assert';
import { McpToolRegistry } from '../src/lib/mcp/tool-registry.ts';
import { registerDefaultTools } from '../src/lib/mcp/tools/index.ts';

console.log('[TEST] Register and list all default MCP tools');
const reg = new McpToolRegistry();
registerDefaultTools(reg);

const tools = reg.listTools();
assert.strictEqual(tools.length, 7);

const toolNames = tools.map(t => t.name);
assert(toolNames.includes('proofix_doctor'));
assert(toolNames.includes('proofix_list_scenarios'));
assert(toolNames.includes('proofix_run_route'));
assert(toolNames.includes('proofix_verify_workspace'));
assert(toolNames.includes('proofix_diagnose_failure'));
assert(toolNames.includes('proofix_prove_patch'));
assert(toolNames.includes('proofix_get_report'));
console.log('✓ All 7 default MCP tools verified.');
