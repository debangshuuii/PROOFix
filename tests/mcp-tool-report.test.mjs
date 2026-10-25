import assert from 'node:assert';
import { handleGetReportTool } from '../src/lib/mcp/tools/report-tool.ts';

console.log('[TEST] proofix_get_report MCP tool');
const res = await handleGetReportTool({ runId: 'run_latest' });
const json = JSON.parse(res.content[0].text);
assert.strictEqual(json.runId, 'run_latest');
assert.strictEqual(json.checks.length, 5);
console.log('✓ proofix_get_report tool test passed.');
