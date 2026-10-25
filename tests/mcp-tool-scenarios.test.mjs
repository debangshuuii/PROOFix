import assert from 'node:assert';
import { handleListScenariosTool, listScenariosToolDef } from '../src/lib/mcp/tools/scenarios-tool.ts';

console.log('[TEST] proofix_list_scenarios MCP tool');
assert.strictEqual(listScenariosToolDef.name, 'proofix_list_scenarios');
const res = await handleListScenariosTool({});
const data = JSON.parse(res.content[0].text);
assert.strictEqual(data.scenarios.length, 3);
console.log('✓ proofix_list_scenarios tool test passed.');
