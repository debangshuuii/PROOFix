/**
 * High-Throughput Safe HTTP Fuzzing Executor & Rate Limiter (Contribution 135)
 */

import type {
  EndpointContract,
  FuzzPayload,
  FuzzExecutionRequest,
  FuzzExecutionResult,
  HttpMethod,
} from '../types/api-fuzzing.ts';

export interface ExecutorOptions {
  baseUrl: string;
  concurrencyLimit?: number;
  timeoutMs?: number;
  maxBodySnippetLength?: number;
  customHeaders?: Record<string, string>;
  fetchFn?: typeof fetch;
}

/**
 * Builds request URL by interpolating path parameters and appending query parameters.
 */
export function buildRequestUrl(
  baseUrl: string,
  pathTemplate: string,
  parameters: { in: string; name: string }[],
  payload: FuzzPayload
): { url: string; queryParams: Record<string, string> } {
  let resolvedPath = pathTemplate;
  const queryParams: Record<string, string> = {};

  for (const param of parameters) {
    let paramVal: any = 'test_val';

    if (payload.targetParameter === param.name) {
      paramVal = payload.value !== undefined ? String(payload.value) : '';
    } else {
      // Default placeholder based on parameter name
      if (param.name.toLowerCase().includes('id')) paramVal = '101';
      else if (param.name.toLowerCase().includes('page')) paramVal = '1';
      else if (param.name.toLowerCase().includes('limit')) paramVal = '10';
      else paramVal = 'sample';
    }

    if (param.in === 'path') {
      resolvedPath = resolvedPath.replace(`{${param.name}}`, encodeURIComponent(paramVal));
      resolvedPath = resolvedPath.replace(`:${param.name}`, encodeURIComponent(paramVal));
    } else if (param.in === 'query') {
      queryParams[param.name] = paramVal;
    }
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
  const fullUrl = new URL(`${cleanBase}${cleanPath}`);

  for (const [k, v] of Object.entries(queryParams)) {
    fullUrl.searchParams.append(k, v);
  }

  return {
    url: fullUrl.toString(),
    queryParams,
  };
}

/**
 * Builds request body by merging schema template defaults with payload mutation.
 */
export function buildRequestBody(
  endpoint: EndpointContract,
  payload: FuzzPayload
): any {
  if (!endpoint.requestBody) return undefined;

  const schema = endpoint.requestBody.schema;
  const baseObject: Record<string, any> = {};

  if (schema && schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.default !== undefined) {
        baseObject[key] = prop.default;
      } else if (prop.type === 'string') {
        baseObject[key] = 'valid_string';
      } else if (prop.type === 'integer' || prop.type === 'number') {
        baseObject[key] = prop.minimum || 1;
      } else if (prop.type === 'boolean') {
        baseObject[key] = true;
      } else if (prop.type === 'array') {
        baseObject[key] = [];
      } else {
        baseObject[key] = {};
      }
    }
  }

  // Inject target mutation if specified
  if (payload.targetField) {
    baseObject[payload.targetField] = payload.value;
  } else if (!payload.targetParameter && payload.value !== undefined && typeof payload.value === 'object') {
    // Whole body replacement
    return payload.value;
  }

  return baseObject;
}

export class FuzzExecutor {
  private baseUrl: string;
  private concurrencyLimit: number;
  private timeoutMs: number;
  private maxBodySnippetLength: number;
  private customHeaders: Record<string, string>;
  private fetchFn: typeof fetch;

  constructor(options: ExecutorOptions) {
    this.baseUrl = options.baseUrl;
    this.concurrencyLimit = options.concurrencyLimit || 5;
    this.timeoutMs = options.timeoutMs || 8000;
    this.maxBodySnippetLength = options.maxBodySnippetLength || 1024;
    this.customHeaders = options.customHeaders || {};
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  /**
   * Prepares a FuzzExecutionRequest from endpoint and payload.
   */
  public prepareRequest(
    endpoint: EndpointContract,
    payload: FuzzPayload
  ): FuzzExecutionRequest {
    const { url, queryParams } = buildRequestUrl(
      this.baseUrl,
      endpoint.path,
      endpoint.parameters,
      payload
    );

    const headers: Record<string, string> = {
      'User-Agent': 'PROOFix-ApiFuzzer/1.0',
      ...this.customHeaders,
      ...(payload.headers || {}),
    };

    let body: any;
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      headers['Content-Type'] = endpoint.requestBody?.contentType || 'application/json';
      body = buildRequestBody(endpoint, payload);
    }

    return {
      endpoint,
      url,
      method: endpoint.method,
      headers,
      queryParams,
      body,
      fuzzPayload: payload,
    };
  }

  /**
   * Executes a single fuzzing request safely.
   */
  public async executeSingle(
    req: FuzzExecutionRequest
  ): Promise<FuzzExecutionResult> {
    const startTime = performance.now();
    const requestId = `fuzz_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let statusCode = 0;
    let statusText = 'ERROR';
    let resHeaders: Record<string, string> = {};
    let bodySnippet = '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: req.headers,
        signal: controller.signal,
      };

      if (req.body !== undefined) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const response = await this.fetchFn(req.url, fetchOptions);
      clearTimeout(timer);

      statusCode = response.status;
      statusText = response.statusText;

      response.headers.forEach((val, key) => {
        resHeaders[key.toLowerCase()] = val;
      });

      const rawText = await response.text();
      bodySnippet = rawText.substring(0, this.maxBodySnippetLength);
    } catch (err: any) {
      statusCode = err.name === 'AbortError' ? 408 : 599;
      statusText = err.name === 'AbortError' ? 'Client Timeout' : (err.message || 'Network Execution Error');
      bodySnippet = `[ERROR] Request failed: ${err.message}`;
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    return {
      id: requestId,
      fuzzPayload: req.fuzzPayload,
      endpointId: req.endpoint.id,
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 300) : undefined,
      },
      response: {
        statusCode,
        statusText,
        headers: resHeaders,
        bodySnippet,
        responseTimeMs: elapsedMs,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Executes a batch of fuzz payloads with concurrency pooling.
   */
  public async executeBatch(
    endpoint: EndpointContract,
    payloads: FuzzPayload[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<FuzzExecutionResult[]> {
    const results: FuzzExecutionResult[] = [];
    let currentIndex = 0;
    let completedCount = 0;

    const worker = async () => {
      while (currentIndex < payloads.length) {
        const index = currentIndex++;
        const payload = payloads[index];
        const req = this.prepareRequest(endpoint, payload);
        const res = await this.executeSingle(req);
        results.push(res);
        completedCount++;
        if (onProgress) onProgress(completedCount, payloads.length);
      }
    };

    const workers: Promise<void>[] = [];
    const poolSize = Math.min(this.concurrencyLimit, payloads.length);

    for (let w = 0; w < poolSize; w++) {
      workers.push(worker());
    }

    await Promise.all(workers);
    return results;
  }
}
