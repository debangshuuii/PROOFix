import { McpToolDefinition, McpToolResult } from '../types/mcp';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export type ToolHandler = (params: any) => Promise<McpToolResult>;

export class McpToolRegistry {
  private tools: Map<string, { def: McpToolDefinition; handler: ToolHandler }> = new Map();

  public register(def: McpToolDefinition, handler: ToolHandler): void {
    this.tools.set(def.name, { def, handler });
  }

  public listTools(): McpToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.def);
  }

  public async execute(name: string, params: any): Promise<McpToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new JsonRpcError(McpErrorCode.UnknownTool, `Tool '${name}' not registered`);
    }
    return await entry.handler(params || {});
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }
}
