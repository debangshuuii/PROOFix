import assert from 'node:assert';
import { McpServer } from '../src/lib/mcp/server.ts';
import { registerDefaultTools } from '../src/lib/mcp/tools/index.ts';
import { registerDefaultResources } from '../src/lib/mcp/resources/index.ts';
import { registerDefaultPrompts } from '../src/lib/mcp/prompts/index.ts';
import { DualPassOrchestrator } from '../src/lib/prover/dual-pass-orchestrator.ts';
import { ClaudeDesktopConfigGenerator } from '../src/lib/mcp/config-generator.ts';

console.log('====================================================');
console.log('  PROOFix MCP Server & Dual-Pass Prover CI Suite');
console.log('====================================================');

// 1. MCP Handshake
const server = new McpServer();
registerDefaultTools(server.tools);
registerDefaultResources(server.resources);
registerDefaultPrompts(server.prompts);

const initRes = await server.handleRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { clientInfo: { name: 'CI-Runner', version: '1.0.0' } }
});
assert.strictEqual(initRes.result.protocolVersion, '2024-11-05');
console.log('[PASS] MCP Server Initialize Handshake (2024-11-05)');

// 2. Tools
const toolsRes = await server.handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
assert.strictEqual(toolsRes.result.tools.length, 7);
console.log('[PASS] MCP 7 Registered Tools Available');

// 3. Tool Execution
const callRes = await server.handleRequest({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: { name: 'proofix_doctor', arguments: {} }
});
assert(callRes.result.content[0].text.includes('node'));
console.log('[PASS] MCP proofix_doctor Execution');

// 4. Resources
const resList = await server.handleRequest({ jsonrpc: '2.0', id: 4, method: 'resources/list' });
assert.strictEqual(resList.result.resources.length, 2);
console.log('[PASS] MCP Resources List');

// 5. Config Generator
const cfg = ClaudeDesktopConfigGenerator.generate();
assert(cfg.mcpServers.proofix !== undefined);
console.log('[PASS] Claude Desktop & Cursor Config Generation');

// 6. Dual-Pass Prover
const proof = await DualPassOrchestrator.executeProof({ scenarioId: 'ecommerce_checkout' });
assert.strictEqual(proof.status, 'PROVEN');
assert(proof.certificate.sha256Fingerprint.length === 64);
assert.strictEqual(proof.certificate.pass2Verification.passRate, 1.0);
console.log('[PASS] Dual-Pass Shadow Prover: 100% Zero-Regression Certified');

console.log('====================================================');
console.log('  All MCP & Prover CI Checks Passed Successfully!');
console.log('====================================================');
