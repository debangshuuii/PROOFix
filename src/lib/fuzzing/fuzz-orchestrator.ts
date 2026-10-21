/**
 * API Fuzzing Audit Orchestrator Service (Contribution 138)
 */

import type {
  ApiFuzzingReport,
  FuzzingConfig,
  FuzzingReportSummary,
  ContractAnomaly,
  EndpointContract,
  FuzzPayload,
  FuzzExecutionResult,
} from '../types/api-fuzzing.ts';
import { parseOpenApiContract } from './contract-parser.ts';
import { generatePayloadsForEndpoint } from './payload-mutator.ts';
import { generateAdversarialPayloads } from './adversarial-mutator.ts';
import { FuzzExecutor } from './fuzz-executor.ts';
import { classifyAnomaly } from './anomaly-classifier.ts';
import { sniffNextJsRoutes, synthesizeOpenApiSpec } from './route-sniffer.ts';

export interface RunFuzzingAuditOptions {
  runId?: string;
  targetBaseUrl?: string;
  specInput?: string | Record<string, any>;
  projectRootDir?: string;
  config?: Partial<FuzzingConfig>;
  fetchFn?: typeof fetch;
  onProgress?: (progress: { endpointIndex: number; totalEndpoints: number; currentPath: string }) => void;
}

export const DEFAULT_FUZZING_CONFIG: FuzzingConfig = {
  targetBaseUrl: 'http://localhost:3000',
  maxRequestsPerEndpoint: 25,
  concurrencyLimit: 4,
  timeoutMs: 5000,
  enabledStrategies: [
    'boundary_values',
    'type_confusion',
    'null_byte_injection',
    'unicode_homoglyphs',
    'sqli_adversarial',
    'xss_adversarial',
    'oversized_payload',
    'auth_tampering',
  ],
  detectDataLeaks: true,
  detectStackTraces: true,
  rateLimitThresholdMs: 2500,
};

/**
 * Calculates contract health score (0-100) based on detected anomalies.
 */
export function calculateHealthScore(
  anomalies: ContractAnomaly[],
  totalRequests: number
): number {
  if (totalRequests === 0) return 100;

  let penalty = 0;
  for (const anom of anomalies) {
    if (anom.severity === 'critical') penalty += 25;
    else if (anom.severity === 'high') penalty += 12;
    else if (anom.severity === 'medium') penalty += 5;
    else if (anom.severity === 'low') penalty += 2;
  }

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

/**
 * Executes a full API fuzzing and contract boundary audit.
 */
export async function runApiFuzzingAudit(
  options: RunFuzzingAuditOptions = {}
): Promise<ApiFuzzingReport> {
  const startTime = Date.now();
  const runId = options.runId || `run_fuzz_${Date.now()}`;
  const config: FuzzingConfig = {
    ...DEFAULT_FUZZING_CONFIG,
    ...(options.config || {}),
    targetBaseUrl: options.targetBaseUrl || options.config?.targetBaseUrl || DEFAULT_FUZZING_CONFIG.targetBaseUrl,
  };

  let endpoints: EndpointContract[] = [];
  let specTitle = 'API Specification';
  let specVersion = '1.0.0';

  // 1. Resolve Endpoints: explicit spec OR auto-sniff codebase
  if (options.specInput) {
    const parseRes = parseOpenApiContract(options.specInput);
    if (parseRes.valid && parseRes.endpoints.length > 0) {
      endpoints = parseRes.endpoints;
      specTitle = parseRes.spec?.info.title || specTitle;
      specVersion = parseRes.spec?.info.version || specVersion;
    }
  }

  if (endpoints.length === 0) {
    const rootDir = options.projectRootDir || process.cwd();
    endpoints = sniffNextJsRoutes(rootDir);
    specTitle = 'Next.js Auto-Sniffed App Routes';
    specVersion = '1.0.0';
  }

  // 2. Initialize HTTP Executor
  const executor = new FuzzExecutor({
    baseUrl: config.targetBaseUrl,
    concurrencyLimit: config.concurrencyLimit,
    timeoutMs: config.timeoutMs,
    customHeaders: config.customHeaders,
    fetchFn: options.fetchFn,
  });

  const allAnomalies: ContractAnomaly[] = [];
  let totalRequestsExecuted = 0;

  // 3. Iterate through endpoints and execute mutations
  for (let epIndex = 0; epIndex < endpoints.length; epIndex++) {
    const endpoint = endpoints[epIndex];
    if (options.onProgress) {
      options.onProgress({
        endpointIndex: epIndex + 1,
        totalEndpoints: endpoints.length,
        currentPath: `${endpoint.method} ${endpoint.path}`,
      });
    }

    // Generate boundary & type confusion payloads
    const boundaryPayloads = generatePayloadsForEndpoint(endpoint, config.enabledStrategies);

    // Generate adversarial security payloads
    const adversarialPayloads = generateAdversarialPayloads(endpoint, config.enabledStrategies);

    // Merge and cap at maxRequestsPerEndpoint
    const combinedPayloads = [...boundaryPayloads, ...adversarialPayloads].slice(
      0,
      config.maxRequestsPerEndpoint
    );

    if (combinedPayloads.length === 0) continue;

    // Execute batch
    const results: FuzzExecutionResult[] = await executor.executeBatch(
      endpoint,
      combinedPayloads
    );
    totalRequestsExecuted += results.length;

    // Classify anomalies
    for (const res of results) {
      const anomaly = classifyAnomaly(endpoint, res, {
        detectStackTraces: config.detectStackTraces,
        performanceThresholdMs: config.rateLimitThresholdMs,
        strictResponses: true,
      });

      if (anomaly) {
        allAnomalies.push(anomaly);
      }
    }
  }

  // 4. Calculate Summary Metrics
  const criticalCount = allAnomalies.filter((a) => a.severity === 'critical').length;
  const highCount = allAnomalies.filter((a) => a.severity === 'high').length;
  const mediumCount = allAnomalies.filter((a) => a.severity === 'medium').length;
  const lowCount = allAnomalies.filter((a) => a.severity === 'low').length;
  const infoCount = allAnomalies.filter((a) => a.severity === 'info').length;

  const durationMs = Date.now() - startTime;
  const healthScore = calculateHealthScore(allAnomalies, totalRequestsExecuted);

  const summary: FuzzingReportSummary = {
    totalEndpointsFuzzed: endpoints.length,
    totalRequestsExecuted,
    totalAnomaliesDetected: allAnomalies.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    durationMs,
    contractHealthScore: healthScore,
  };

  return {
    id: `rep_fuzz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    runId,
    targetBaseUrl: config.targetBaseUrl,
    specTitle,
    specVersion,
    createdAt: new Date().toISOString(),
    config,
    summary,
    endpoints,
    anomalies: allAnomalies,
  };
}
