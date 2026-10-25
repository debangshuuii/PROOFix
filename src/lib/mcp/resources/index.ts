import { McpResourceRegistry } from '../resource-registry';

export function registerDefaultResources(registry: McpResourceRegistry): void {
  registry.register(
    {
      uri: 'proofix://reports/latest',
      name: 'Latest Verification Report',
      description: 'Active verification run summary, test checks, and defect evidence',
      mimeType: 'application/json'
    },
    async (uri) => {
      const data = {
        uri,
        runId: 'run_latest',
        status: 'completed',
        timestamp: new Date().toISOString(),
        summary: { passed: 5, failed: 1, total: 6 }
      };
      return { uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) };
    }
  );

  registry.register(
    {
      uri: 'proofix://scenarios',
      name: 'Interactive Defect Scenarios',
      description: 'Directory of pre-seeded reproducible bug fixtures',
      mimeType: 'application/json'
    },
    async (uri) => {
      const scenarios = ['ecommerce_checkout', 'ssr_hydration_drift', 'sqli_preflight_gate'];
      return { uri, mimeType: 'application/json', text: JSON.stringify({ scenarios }, null, 2) };
    }
  );
}
