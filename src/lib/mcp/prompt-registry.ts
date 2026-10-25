import { McpPromptDefinition } from '../types/mcp';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export type PromptRenderer = (args: Record<string, string>) => Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>>;

export class McpPromptRegistry {
  private prompts: Map<string, { def: McpPromptDefinition; renderer: PromptRenderer }> = new Map();

  public register(def: McpPromptDefinition, renderer: PromptRenderer): void {
    this.prompts.set(def.name, { def, renderer });
  }

  public listPrompts(): McpPromptDefinition[] {
    return Array.from(this.prompts.values()).map(p => p.def);
  }

  public async getPrompt(name: string, args: Record<string, string>): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
    const entry = this.prompts.get(name);
    if (!entry) {
      throw new JsonRpcError(McpErrorCode.InvalidParams, `Prompt '${name}' not found`);
    }
    return await entry.renderer(args || {});
  }
}
