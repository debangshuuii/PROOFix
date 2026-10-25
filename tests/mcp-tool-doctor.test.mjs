import assert from 'node:assert';
import { handleDoctorTool, doctorToolDef } from '../src/lib/mcp/tools/doctor-tool.ts';

console.log('[TEST] proofix_doctor MCP tool');
assert.strictEqual(doctorToolDef.name, 'proofix_doctor');
const res = await handleDoctorTool({});
assert(res.content && res.content.length > 0);
const data = JSON.parse(res.content[0].text);
assert(data.node.valid);
console.log('✓ proofix_doctor tool test passed.');
