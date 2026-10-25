import assert from 'node:assert';
import { handleDiagnoseTool } from '../src/lib/mcp/tools/diagnose-tool.ts';

console.log('[TEST] proofix_diagnose_failure MCP tool');
const res = await handleDiagnoseTool({ errorLog: 'Error: Failed to fetch API' });
const json = JSON.parse(res.content[0].text);
assert(json.patchDiff.includes('+++ b/'));
assert(json.observedFacts.length > 0);
console.log('✓ proofix_diagnose_failure tool test passed.');
