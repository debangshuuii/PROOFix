import { JsonRpcRequest, JsonRpcResponse } from '../types/mcp';
import { McpProtocolState } from './state';
import { McpToolRegistry } from './tool-registry';
import { McpResourceRegistry } from './resource-registry';
import { McpPromptRegistry } from './prompt-registry';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export class McpServer {
  public state: McpProtocolState = new McpProtocolState();
  public tools: McpToolRegistry = new McpToolRegistry();
  public resources: McpResourceRegistry = new McpResourceRegistry();
  public prompts: McpPromptRegistry = new McpPromptRegistry();

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = req.id ?? null;
    try {
      switch (req.method) {
        case 'initialize': {
          this.state.handleInitialize(req.params?.clientInfo);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
              },
              serverInfo: {
                name: 'proofix-mcp-server',
                version: '0.1.0',
              },
            },
          };
        }
        case 'notifications/initialized': {
          this.state.handleInitialized();
          return { jsonrpc: '2.0', id, result: {} };
        }
        case 'ping': {
          return { jsonrpc: '2.0', id, result: {} };
        }
        case 'tools/list': {
          return { jsonrpc: '2.0', id, result: { tools: this.tools.listTools() } };
        }
        case 'tools/call': {
          const name = req.params?.name;
          const args = req.params?.arguments || {};
          const result = await this.tools.execute(name, args);
          return { jsonrpc: '2.0', id, result };
        }
        case 'resources/list': {
          return { jsonrpc: '2.0', id, result: { resources: this.resources.listResources() } };
        }
        case 'resources/read': {
          const uri = req.params?.uri;
          const resource = await this.resources.read(uri);
          return { jsonrpc: '2.0', id, result: { contents: [resource] } };
        }
        case 'prompts/list': {
          return { jsonrpc: '2.0', id, result: { prompts: this.prompts.listPrompts() } };
        }
        case 'prompts/get': {
          const name = req.params?.name;
          const args = req.params?.arguments || {};
          const messages = await this.prompts.getPrompt(name, args);
          return { jsonrpc: '2.0', id, result: { messages } };
        }
        default:
          throw JsonRpcError.methodNotFound(req.method);
      }
    } catch (err: any) {
      if (err instanceof JsonRpcError) {
        return { jsonrpc: '2.0', id, error: err.toObject() };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: McpErrorCode.InternalError, message: err.message || 'Internal error' },
      };
    }
  }
}
