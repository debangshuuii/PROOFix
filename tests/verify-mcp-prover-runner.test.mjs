import assert from 'node:assert';
import { execSync } from 'node:child_process';

console.log('[TEST] Executing verify-mcp-prover-ci.mjs');
const output = execSync('node tests/verify-mcp-prover-ci.mjs', { encoding: 'utf-8' });
assert(output.includes('All MCP & Prover CI Checks Passed Successfully!'));
console.log('✓ verify-mcp-prover-ci runner test passed.');
