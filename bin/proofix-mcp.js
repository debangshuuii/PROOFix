#!/usr/bin/env node

/**
 * PROOFix Model Context Protocol (MCP) Server Binary
 * Exposes automated verification, route checking, and dual-pass proving via stdio JSON-RPC 2.0.
 */

const { McpServer } = require('../src/lib/mcp/server.ts');
const { McpStdioTransport } = require('../src/lib/mcp/transport.ts');
const { registerDefaultTools } = require('../src/lib/mcp/tools/index.ts');
const { registerDefaultResources } = require('../src/lib/mcp/resources/index.ts');
const { registerDefaultPrompts } = require('../src/lib/mcp/prompts/index.ts');

async function startMcpServer() {
  const server = new McpServer();
  registerDefaultTools(server.tools);
  registerDefaultResources(server.resources);
  registerDefaultPrompts(server.prompts);

  const transport = new McpStdioTransport();
  transport.start(async (req) => {
    const res = await server.handleRequest(req);
    transport.send(res);
  });

  process.stderr.write('[PROOFix MCP Server] Listening on stdio (Protocol 2024-11-05)\n');
}

if (require.main === module) {
  startMcpServer().catch((err) => {
    process.stderr.write('[MCP FATAL ERROR] ' + (err.stack || err.message) + '\n');
    process.exit(1);
  });
}

module.exports = { startMcpServer };
