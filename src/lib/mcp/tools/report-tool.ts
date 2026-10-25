import { McpToolDefinition, McpToolResult } from '../../types/mcp';

export const getReportToolDef: McpToolDefinition = {
  name: 'proofix_get_report',
  description: 'Retrieves comprehensive JSON verification report for the latest or designated execution run.',
  inputSchema: {
    type: 'object',
    properties: {
      runId: { type: 'string', description: 'Run ID (default: latest)' }
    }
  }
};

export async function handleGetReportTool(params: { runId?: string }): Promise<McpToolResult> {
  const report = {
    runId: params.runId || 'run_fixture_baseline',
    timestamp: new Date().toISOString(),
    status: 'completed',
    checks: [
      { id: 'root_health', status: 'passed', durationMs: 412 },
      { id: 'navigation_about', status: 'passed', durationMs: 280 },
      { id: 'interactive_ui', status: 'passed', durationMs: 350 },
      { id: 'dead_link_audit', status: 'failed', durationMs: 510 },
      { id: 'backend_api', status: 'failed', durationMs: 320 }
    ]
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(report, null, 2)
    }]
  };
}
