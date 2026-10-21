/**
 * Contract Anomaly & Vulnerability Classifier Engine (Contribution 136)
 */

import type {
  EndpointContract,
  FuzzExecutionResult,
  ContractAnomaly,
  AnomalySeverity,
  AnomalyCategory,
  HttpMethod,
} from '../types/api-fuzzing.ts';

export interface ClassifierOptions {
  detectStackTraces?: boolean;
  performanceThresholdMs?: number;
  strictResponses?: boolean;
}

const STACK_TRACE_PATTERNS = [
  /at\s+[\w\$./<>]+\s+\([\w\s.:\/\\]+:\d+:\d+\)/i, // Node.js / V8 stack frame
  /node_modules\/[a-z0-9_\-\/.]+/i,
  /webpack-internal:\/\/\//i,
  /Traceback \(most recent call last\):/i,          // Python
  /java\.lang\.[a-zA-Z]+Exception/i,               // Java
  /Fatal error: Uncaught/i,                        // PHP
  /PostgresError|SequelizeDatabaseError|PrismaClientKnownRequestError/i, // ORM / DB leaks
];

/**
 * Generates an exact curl command developers can copy-paste to reproduce the issue.
 */
export function generateCurlReproducer(
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  bodyPreview?: string
): string {
  const parts: string[] = [`curl -X ${method} "${url}"`];

  for (const [k, v] of Object.entries(headers)) {
    // Escape double quotes in headers
    parts.push(`-H "${k}: ${v.replace(/"/g, '\\"')}"`);
  }

  if (bodyPreview && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Escape single quotes for bash shell
    const escapedBody = bodyPreview.replace(/'/g, `'\\''`);
    parts.push(`-d '${escapedBody}'`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Inspects a FuzzExecutionResult and determines if a contract anomaly or security vulnerability occurred.
 */
export function classifyAnomaly(
  endpoint: EndpointContract,
  result: FuzzExecutionResult,
  options: ClassifierOptions = {}
): ContractAnomaly | null {
  const { response, fuzzPayload, request } = result;
  const status = response.statusCode;
  const body = response.bodySnippet || '';
  const perfLimit = options.performanceThresholdMs || 2500;

  // 1. Stack Trace / Information Leak Detection (CWE-209)
  if (options.detectStackTraces !== false && status >= 400) {
    for (const pattern of STACK_TRACE_PATTERNS) {
      if (pattern.test(body)) {
        return {
          id: `anom_leak_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          endpointId: endpoint.id,
          endpointPath: endpoint.path,
          method: endpoint.method,
          severity: 'critical',
          category: 'information_disclosure',
          title: 'Stack Trace / Internal File Path Disclosure',
          description: `Server leaked internal execution stack frames or database exceptions in response body. Pattern match: "${pattern.source}"`,
          fuzzStrategy: fuzzPayload.strategy,
          fuzzPayloadSnippet: typeof fuzzPayload.value === 'string' ? fuzzPayload.value : JSON.stringify(fuzzPayload.value || fuzzPayload.headers),
          reproducingRequest: {
            method: endpoint.method,
            url: request.url,
            headers: request.headers,
            body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
            curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
          },
          observedResponse: {
            statusCode: status,
            headers: response.headers,
            bodySnippet: body.substring(0, 500),
            responseTimeMs: response.responseTimeMs,
          },
          remediationRecommendation: 'Configure production error boundaries to suppress raw exception details and return safe generic JSON errors.',
          cweId: 'CWE-209',
        };
      }
    }
  }

  // 2. Unhandled Server Exception (500 / 502 / 503 / 504)
  if (status >= 500 && status <= 599) {
    const isCritical = ['sqli_adversarial', 'null_byte_injection', 'oversized_payload'].includes(fuzzPayload.strategy);
    return {
      id: `anom_500_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      endpointId: endpoint.id,
      endpointPath: endpoint.path,
      method: endpoint.method,
      severity: isCritical ? 'critical' : 'high',
      category: 'unhandled_server_exception',
      title: `Unhandled HTTP ${status} Server Exception on ${fuzzPayload.strategy}`,
      description: `Target endpoint crashed or unhandled exception thrown when sent payload: "${fuzzPayload.description}". Server should return 400/422 Bad Request instead.`,
      fuzzStrategy: fuzzPayload.strategy,
      fuzzPayloadSnippet: typeof fuzzPayload.value === 'string' ? fuzzPayload.value : JSON.stringify(fuzzPayload.value || fuzzPayload.headers),
      reproducingRequest: {
        method: endpoint.method,
        url: request.url,
        headers: request.headers,
        body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
        curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
      },
      observedResponse: {
        statusCode: status,
        headers: response.headers,
        bodySnippet: body.substring(0, 500),
        responseTimeMs: response.responseTimeMs,
      },
      remediationRecommendation: 'Wrap request parameter parsing and database queries in try/catch blocks with validation guardrails.',
      cweId: 'CWE-754',
    };
  }

  // 3. Authentication Tampering Bypass (CWE-287)
  if (fuzzPayload.strategy === 'auth_tampering' && status >= 200 && status < 300) {
    return {
      id: `anom_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      endpointId: endpoint.id,
      endpointPath: endpoint.path,
      method: endpoint.method,
      severity: 'critical',
      category: 'unauthenticated_leak',
      title: 'Authentication Verification Bypass Detected',
      description: `Endpoint returned HTTP ${status} OK when presented with invalid/tampered auth headers: "${fuzzPayload.description}".`,
      fuzzStrategy: fuzzPayload.strategy,
      fuzzPayloadSnippet: JSON.stringify(fuzzPayload.headers),
      reproducingRequest: {
        method: endpoint.method,
        url: request.url,
        headers: request.headers,
        body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
        curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
      },
      observedResponse: {
        statusCode: status,
        headers: response.headers,
        bodySnippet: body.substring(0, 500),
        responseTimeMs: response.responseTimeMs,
      },
      remediationRecommendation: 'Verify authentication tokens in middleware before executing handler business logic, returning 401 Unauthorized on invalid tokens.',
      cweId: 'CWE-287',
    };
  }

  // 4. Potential Security Injection Acceptance (200 on SQLi / XSS / Null byte)
  if (['sqli_adversarial', 'null_byte_injection'].includes(fuzzPayload.strategy) && status >= 200 && status < 300) {
    // If the endpoint explicitly requires validation and returned 200 with an injection payload without sanitization
    return {
      id: `anom_inj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      endpointId: endpoint.id,
      endpointPath: endpoint.path,
      method: endpoint.method,
      severity: 'high',
      category: 'security_validation_bypass',
      title: `Unvalidated Acceptance of ${fuzzPayload.strategy.replace('_', ' ')} Vector`,
      description: `Endpoint accepted malicious input payload ("${fuzzPayload.description}") with HTTP ${status} success. Input must be strictly validated or rejected with 400.`,
      fuzzStrategy: fuzzPayload.strategy,
      fuzzPayloadSnippet: typeof fuzzPayload.value === 'string' ? fuzzPayload.value : JSON.stringify(fuzzPayload.value),
      reproducingRequest: {
        method: endpoint.method,
        url: request.url,
        headers: request.headers,
        body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
        curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
      },
      observedResponse: {
        statusCode: status,
        headers: response.headers,
        bodySnippet: body.substring(0, 500),
        responseTimeMs: response.responseTimeMs,
      },
      remediationRecommendation: 'Implement input validation schema with strict regex or character whitelist (e.g. Zod / Joi).',
      cweId: 'CWE-20',
    };
  }

  // 5. Performance Spike / Latency Degradation (Potential ReDoS or Lock)
  if (response.responseTimeMs >= perfLimit) {
    return {
      id: `anom_perf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      endpointId: endpoint.id,
      endpointPath: endpoint.path,
      method: endpoint.method,
      severity: 'medium',
      category: 'performance_degradation',
      title: `Severe Latency Spike (${response.responseTimeMs}ms) Detected`,
      description: `Request processing took ${response.responseTimeMs}ms (threshold: ${perfLimit}ms) when evaluated against payload "${fuzzPayload.description}". Potential ReDoS or unindexed query bottleneck.`,
      fuzzStrategy: fuzzPayload.strategy,
      fuzzPayloadSnippet: typeof fuzzPayload.value === 'string' ? fuzzPayload.value : JSON.stringify(fuzzPayload.value),
      reproducingRequest: {
        method: endpoint.method,
        url: request.url,
        headers: request.headers,
        body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
        curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
      },
      observedResponse: {
        statusCode: status,
        headers: response.headers,
        bodySnippet: body.substring(0, 500),
        responseTimeMs: response.responseTimeMs,
      },
      remediationRecommendation: 'Check regex patterns for exponential catastrophic backtracking and add request processing timeouts.',
      cweId: 'CWE-400',
    };
  }

  // 6. Contract Response Schema Mismatch / Undocumented Status Code
  if (options.strictResponses && endpoint.responses) {
    const documentedCodes = Object.keys(endpoint.responses);
    const strStatus = String(status);
    if (!documentedCodes.includes(strStatus) && !documentedCodes.includes('default')) {
      return {
        id: `anom_doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        endpointId: endpoint.id,
        endpointPath: endpoint.path,
        method: endpoint.method,
        severity: 'low',
        category: 'unexpected_status_code',
        title: `Undocumented Status Code HTTP ${status}`,
        description: `Endpoint returned HTTP ${status}, but OpenAPI spec only documents: [${documentedCodes.join(', ')}].`,
        fuzzStrategy: fuzzPayload.strategy,
        fuzzPayloadSnippet: typeof fuzzPayload.value === 'string' ? fuzzPayload.value : JSON.stringify(fuzzPayload.value),
        reproducingRequest: {
          method: endpoint.method,
          url: request.url,
          headers: request.headers,
          body: request.bodyPreview ? JSON.parse(request.bodyPreview) : undefined,
          curlCommand: generateCurlReproducer(endpoint.method, request.url, request.headers, request.bodyPreview),
        },
        observedResponse: {
          statusCode: status,
          headers: response.headers,
          bodySnippet: body.substring(0, 500),
          responseTimeMs: response.responseTimeMs,
        },
        remediationRecommendation: `Update OpenAPI specification contract to include response definition for HTTP ${status}.`,
      };
    }
  }

  return null;
}
