import { McpErrorCode, JsonRpcErrorObject } from '../types/mcp';

export class JsonRpcError extends Error {
  public code: number;
  public data?: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = 'JsonRpcError';
    this.code = code;
    this.data = data;
  }

  public toObject(): JsonRpcErrorObject {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined ? { data: this.data } : {}),
    };
  }

  static methodNotFound(method: string): JsonRpcError {
    return new JsonRpcError(McpErrorCode.MethodNotFound, `Method not found: ${method}`);
  }

  static invalidParams(message: string): JsonRpcError {
    return new JsonRpcError(McpErrorCode.InvalidParams, message);
  }

  static internal(message: string, data?: any): JsonRpcError {
    return new JsonRpcError(McpErrorCode.InternalError, message, data);
  }
}
