import { JsonRpcRequest } from '../types/mcp';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export class JsonRpcMessageParser {
  private buffer: string = '';

  public append(chunk: string): JsonRpcRequest[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    const messages: JsonRpcRequest[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
          messages.push(parsed as JsonRpcRequest);
        } else {
          throw new JsonRpcError(McpErrorCode.InvalidRequest, 'Invalid JSON-RPC 2.0 payload');
        }
      } catch (err: any) {
        if (err instanceof JsonRpcError) throw err;
        throw new JsonRpcError(McpErrorCode.ParseError, 'Parse error: malformed JSON');
      }
    }
    return messages;
  }

  public reset(): void {
    this.buffer = '';
  }
}
