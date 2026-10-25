import { McpToolDefinition, McpToolResult } from '../../types/mcp';

export const listScenariosToolDef: McpToolDefinition = {
  name: 'proofix_list_scenarios',
  description: 'Lists all available zero-configuration interactive defect benchmark scenarios.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function handleListScenariosTool(_params: any): Promise<McpToolResult> {
  const scenarios = [
    {
      id: 'ecommerce_checkout',
      name: 'E-Commerce Broken Checkout',
      defectType: '404 Missing API & Form Crash',
      description: 'Cart checkout fails due to missing /api/checkout route and unhandled error boundary.',
    },
    {
      id: 'ssr_hydration_drift',
      name: 'Next.js SSR Hydration Drift',
      defectType: 'React 19 Hydration Mismatch',
      description: 'Server/client timestamp divergence causing React Error #418 DOM drift.',
    },
    {
      id: 'sqli_preflight_gate',
      name: 'SQL Injection Preflight Gate',
      defectType: 'CWE-89 AST Vulnerability Gate',
      description: 'Raw string concatenation in SQL queries intercepted by preflight AST validator.',
    }
  ];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ scenarios }, null, 2)
    }]
  };
}
