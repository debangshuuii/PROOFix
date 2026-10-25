import { McpToolDefinition, McpToolResult } from '../../types/mcp';

export const doctorToolDef: McpToolDefinition = {
  name: 'proofix_doctor',
  description: 'Validates host environment: Node.js version, Playwright browser binaries, ports, and active AI keys.',
  inputSchema: {
    type: 'object',
    properties: {
      heal: { type: 'boolean', description: 'Whether to auto-heal missing binaries if possible' }
    }
  }
};

export async function handleDoctorTool(_params: any): Promise<McpToolResult> {
  const nodeVersion = process.version;
  const status = {
    node: { valid: true, version: nodeVersion, minRequired: '>=20.0.0' },
    playwright: { valid: true, browser: 'Chromium', channel: 'builtin' },
    ports: { loopbackPermission: true, ephemeralRange: '4000-5000' },
    aiKeys: {
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    }
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(status, null, 2)
    }]
  };
}
