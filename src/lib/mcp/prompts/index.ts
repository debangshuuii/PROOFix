import { McpPromptRegistry } from '../prompt-registry';

export function registerDefaultPrompts(registry: McpPromptRegistry): void {
  registry.register(
    {
      name: 'verify_and_repair',
      description: 'Inspect workspace with Playwright, diagnose errors, and verify self-healing patch.',
      arguments: [
        { name: 'targetRoute', description: 'Route to prioritize', required: false }
      ]
    },
    async (args) => {
      const route = args.targetRoute || '/';
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Act as an autonomous verification engineer. Run proofix_run_route on "${route}", check for 404s, hydration drift, and unhandled JS exceptions. If any failure occurs, call proofix_diagnose_failure and proofix_prove_patch to guarantee zero regressions.`
          }
        }
      ];
    }
  );

  registry.register(
    {
      name: 'wcag_audit',
      description: 'Audit accessibility compliance and keyboard navigation traps.',
      arguments: []
    },
    async () => {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Run accessibility checks across all discovered routes. Highlight missing aria attributes, color contrast failures under 4.5:1, and form label mismatches.'
          }
        }
      ];
    }
  );
}
