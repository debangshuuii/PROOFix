import assert from 'node:assert';
import { McpResourceRegistry } from '../src/lib/mcp/resource-registry.ts';
import { registerDefaultResources } from '../src/lib/mcp/resources/index.ts';

console.log('[TEST] MCP Resources');
const reg = new McpResourceRegistry();
registerDefaultResources(reg);

const list = reg.listResources();
assert.strictEqual(list.length, 2);

const rep = await reg.read('proofix://reports/latest');
assert(rep.text.includes('run_latest'));

const scn = await reg.read('proofix://scenarios');
assert(scn.text.includes('ecommerce_checkout'));
console.log('✓ MCP Resources verified.');
