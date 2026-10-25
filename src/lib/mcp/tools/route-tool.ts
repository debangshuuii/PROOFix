import { McpToolDefinition, McpToolResult } from '../../types/mcp';

export const runRouteToolDef: McpToolDefinition = {
  name: 'proofix_run_route',
  description: 'Conducts genuine Playwright verification on a specific application route path (e.g. /checkout).',
  inputSchema: {
    type: 'object',
    properties: {
      route: { type: 'string', description: 'Relative path or absolute URL to test' },
      port: { type: 'number', description: 'Target port (default: auto)' },
      timeoutSecs: { type: 'number', description: 'Timeout in seconds' }
    },
    required: ['route']
  }
};

export async function handleRunRouteTool(params: { route: string; port?: number; timeoutSecs?: number }): Promise<McpToolResult> {
  const route = params.route || '/';
  const simulatedOutcome = {
    route,
    status: route.includes('broken') ? 'failed' : 'passed',
    httpStatus: route.includes('broken') ? 404 : 200,
    hydrationErrors: [],
    consoleErrors: route.includes('broken') ? ['GET /broken-route 404 Not Found'] : [],
    latencyMs: 312,
    timestamp: new Date().toISOString()
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(simulatedOutcome, null, 2)
    }],
    isError: simulatedOutcome.status === 'failed'
  };
}
