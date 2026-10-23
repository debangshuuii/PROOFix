/**
 * Interactive API Documentation Contracts
 *
 * Defines models for endpoint documentation cards, code snippet languages,
 * request execution states, and schema inspection.
 */

import type { OpenApiParameter, OpenApiRequestBody, OpenApiResponse } from './openapi';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type CodeLanguage = 'curl' | 'javascript' | 'python' | 'node';

export interface ApiDocEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  tag: string;
  summary: string;
  description: string;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  deprecated?: boolean;
}

export interface TryItOutState {
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headerParams: Record<string, string>;
  requestBodyText: string;
  apiKey: string;
  isLoading: boolean;
  responseStatus?: number;
  responseLatencyMs?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
}

export interface DocsTagGroup {
  name: string;
  description?: string;
  endpoints: ApiDocEndpoint[];
}
