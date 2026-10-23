/**
 * OpenAPI 3.1 Specification Data Contracts
 *
 * Provides strongly-typed models for endpoints, parameters, request bodies,
 * response schemas, components, and security specifications.
 */

export interface OpenApiInfo {
  title: string;
  version: string;
  description: string;
  termsOfService?: string;
  contact?: {
    name: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiTag {
  name: string;
  description?: string;
  externalDocs?: {
    description: string;
    url: string;
  };
}

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema: OpenApiSchema;
  example?: any;
}

export interface OpenApiSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  enum?: (string | number | boolean)[];
  example?: any;
  default?: any;
  nullable?: boolean;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  $ref?: string;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: OpenApiSchema; example?: any }>;
}

export interface OpenApiResponse {
  description: string;
  headers?: Record<string, { description?: string; schema: OpenApiSchema }>;
  content?: Record<string, { schema: OpenApiSchema; example?: any }>;
}

export interface OpenApiOperation {
  tags?: string[];
  summary: string;
  description?: string;
  operationId: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface OpenApiPathItem {
  summary?: string;
  description?: string;
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
  patch?: OpenApiOperation;
  parameters?: OpenApiParameter[];
}

export interface OpenApiComponents {
  schemas?: Record<string, OpenApiSchema>;
  responses?: Record<string, OpenApiResponse>;
  parameters?: Record<string, OpenApiParameter>;
  securitySchemes?: Record<string, any>;
}

export interface OpenApiSpec {
  openapi: string; // '3.1.0'
  info: OpenApiInfo;
  servers: OpenApiServer[];
  tags: OpenApiTag[];
  paths: Record<string, OpenApiPathItem>;
  components: OpenApiComponents;
}
