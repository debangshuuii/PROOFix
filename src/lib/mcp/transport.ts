import { JsonRpcRequest, JsonRpcResponse } from '../types/mcp';
import { JsonRpcMessageParser } from './parser';

export class McpStdioTransport {
  private parser: JsonRpcMessageParser = new JsonRpcMessageParser();
  private onMessageCallback?: (msg: JsonRpcRequest) => void;

  public start(onMessage: (msg: JsonRpcRequest) => void): void {
    this.onMessageCallback = onMessage;
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      try {
        const msgs = this.parser.append(chunk);
        for (const m of msgs) {
          if (this.onMessageCallback) this.onMessageCallback(m);
        }
      } catch (err: any) {
        this.sendError(null, err.code || -32700, err.message || 'Parse error');
      }
    });
  }

  public send(response: JsonRpcResponse): void {
    const json = JSON.stringify(response);
    process.stdout.write(json + '\n');
  }

  public sendError(id: string | number | null, code: number, message: string): void {
    this.send({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    });
  }
}
