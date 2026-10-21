/**
 * API Fuzzing & Contract Boundary Testing Types (Contribution 131)
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type FuzzStrategyType =
  | 'boundary_values'
  | 'type_confusion'
  | 'null_byte_injection'
  | 'unicode_homoglyphs'
  | 'sqli_adversarial'
  | 'xss_adversarial'
  | 'oversized_payload'
  | 'schema_violation'
  | 'auth_tampering'
  | 'rate_limit_probe';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AnomalyCategory =
  | 'unhandled_server_exception'   // 500 with stack trace or internal error
  | 'contract_schema_mismatch'     // Response violates documented schema
  | 'security_validation_bypass'   // Malicious probe accepted with 200 OK
  | 'unauthenticated_leak'         // Sensitive data exposed without auth
  | 'performance_degradation'      // Latency spike (>2000ms / potential ReDoS)
  | 'unexpected_status_code'       // Response code not in OpenAPI spec
  | 'information_disclosure';      // Server headers, DB paths, or secrets leaked

export interface ParameterContract {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: (string | number)[];
  description?: string;
}

export interface SchemaPropertyContract {
  type: string;
  format?: string;
  required?: boolean;
  items?: SchemaPropertyContract;
  properties?: Record<string, SchemaPropertyContract>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  default?: any;
}

export interface RequestBodyContract {
  contentType: string;
  required: boolean;
  schema: SchemaPropertyContract;
}

export interface ResponseContract {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: SchemaPropertyContract;
}

export interface EndpointContract {
  id: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  parameters: ParameterContract[];
  requestBody?: RequestBodyContract;
  responses: Record<string, ResponseContract>;
  tags?: string[];
  security?: Record<string, string[]>[];
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

export interface FuzzPayload {
  id: string;
  strategy: FuzzStrategyType;
  endpointId: string;
  targetParameter?: string;
  targetField?: string;
  value: any;
  headers?: Record<string, string>;
  description: string;
}

export interface FuzzExecutionRequest {
  endpoint: EndpointContract;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: any;
  fuzzPayload: FuzzPayload;
}

export interface FuzzExecutionResult {
  id: string;
  fuzzPayload: FuzzPayload;
  endpointId: string;
  request: {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    bodyPreview?: string;
  };
  response: {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    bodySnippet: string;
    responseTimeMs: number;
  };
  timestamp: string;
}

export interface ContractAnomaly {
  id: string;
  endpointId: string;
  endpointPath: string;
  method: HttpMethod;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  title: string;
  description: string;
  fuzzStrategy: FuzzStrategyType;
  fuzzPayloadSnippet: string;
  reproducingRequest: {
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    body?: any;
    curlCommand: string;
  };
  observedResponse: {
    statusCode: number;
    headers: Record<string, string>;
    bodySnippet: string;
    responseTimeMs: number;
  };
  remediationRecommendation: string;
  cweId?: string; // Common Weakness Enumeration
}

export interface FuzzingConfig {
  targetBaseUrl: string;
  maxRequestsPerEndpoint: number;
  concurrencyLimit: number;
  timeoutMs: number;
  enabledStrategies: FuzzStrategyType[];
  detectDataLeaks: boolean;
  detectStackTraces: boolean;
  rateLimitThresholdMs: number;
  customHeaders?: Record<string, string>;
}

export interface FuzzingReportSummary {
  totalEndpointsFuzzed: number;
  totalRequestsExecuted: number;
  totalAnomaliesDetected: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  durationMs: number;
  contractHealthScore: number; // 0 to 100
}

export interface ApiFuzzingReport {
  id: string;
  runId: string;
  targetBaseUrl: string;
  specTitle: string;
  specVersion: string;
  createdAt: string;
  config: FuzzingConfig;
  summary: FuzzingReportSummary;
  endpoints: EndpointContract[];
  anomalies: ContractAnomaly[];
}
