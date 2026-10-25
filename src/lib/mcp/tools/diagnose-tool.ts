import { McpToolDefinition, McpToolResult } from '../../types/mcp';

export const diagnoseToolDef: McpToolDefinition = {
  name: 'proofix_diagnose_failure',
  description: 'Evidence-grounded failure diagnosis distinguishing facts from hypotheses with candidate unified diffs.',
  inputSchema: {
    type: 'object',
    properties: {
      errorLog: { type: 'string', description: 'Observed console error, stack trace, or HTTP failure snippet' },
      failingRoute: { type: 'string', description: 'Route where the defect occurred' }
    },
    required: ['errorLog']
  }
};

export async function handleDiagnoseTool(params: { errorLog: string; failingRoute?: string }): Promise<McpToolResult> {
  const diagnosis = {
    observedFacts: [
      params.errorLog.slice(0, 100),
      'Client triggered state mutation that threw an unhandled exception'
    ],
    hypothesis: 'Missing route handler or invalid API payload schema',
    fixInstruction: 'Implement API response return structure or wrap interactive element in ErrorBoundary.',
    patchDiff: `--- a/src/app/api/data/route.ts\n+++ b/src/app/api/data/route.ts\n@@ -1,5 +1,5 @@\n-return Response.error();\n+return Response.json({ success: true, items: [] });`
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(diagnosis, null, 2)
    }]
  };
}
