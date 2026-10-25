import assert from 'node:assert';
import { handleProvePatchTool } from '../src/lib/mcp/tools/prove-tool.ts';

console.log('[TEST] proofix_prove_patch MCP tool');
const res = await handleProvePatchTool({ scenarioId: 'ecommerce_checkout' });
const json = JSON.parse(res.content[0].text);
assert.strictEqual(json.status, 'PROVEN');
assert.strictEqual(json.baselinePassRate, 1.0);
console.log('✓ proofix_prove_patch tool test passed.');
