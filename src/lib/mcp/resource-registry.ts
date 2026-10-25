import { McpResourceDefinition } from '../types/mcp';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export type ResourceReader = (uri: string) => Promise<{ uri: string; mimeType: string; text?: string; blob?: string }>;

export class McpResourceRegistry {
  private resources: Map<string, { def: McpResourceDefinition; reader: ResourceReader }> = new Map();

  public register(def: McpResourceDefinition, reader: ResourceReader): void {
    this.resources.set(def.uri, { def, reader });
  }

  public listResources(): McpResourceDefinition[] {
    return Array.from(this.resources.values()).map(r => r.def);
  }

  public async read(uri: string): Promise<{ uri: string; mimeType: string; text?: string; blob?: string }> {
    const entry = this.resources.get(uri);
    if (!entry) {
      throw new JsonRpcError(McpErrorCode.InvalidParams, `Resource '${uri}' not found`);
    }
    return await entry.reader(uri);
  }
}
