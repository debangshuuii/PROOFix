import { JsonRpcRequest } from '../types/mcp';
import { JsonRpcError } from './errors';
import { McpErrorCode } from '../types/mcp';

export class McpRequestValidator {
  public static validate(req: any): JsonRpcRequest {
    if (!req || typeof req !== 'object') {
      throw new JsonRpcError(McpErrorCode.InvalidRequest, 'Request must be an object');
    }
    if (req.jsonrpc !== '2.0') {
      throw new JsonRpcError(McpErrorCode.InvalidRequest, 'Invalid jsonrpc version, expected 2.0');
    }
    if (typeof req.method !== 'string' || !req.method.trim()) {
      throw new JsonRpcError(McpErrorCode.InvalidRequest, 'Request method must be a non-empty string');
    }
    return req as JsonRpcRequest;
  }
}
