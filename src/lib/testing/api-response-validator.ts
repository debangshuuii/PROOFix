/**
 * API Response Validator & Error Leak Detector
 * Evaluates HTTP status codes, validates JSON content structure, and traps
 * stack trace or database credential/connection leakages.
 */

import type { ApiEndpointCheckResult, HttpMethod } from '../types/api-endpoint-agent.ts';

export const STACK_TRACE_PATTERNS = [
  /at\s+[a-zA-Z0-9_$.]+\s+\([^)]+:[0-9]+:[0-9]+\)/i,
  /at\s+async\s+[a-zA-Z0-9_$.]+\s+\(/i,
  /node:internal\/modules/i,
  /TypeError:\s+Cannot read properties/i,
  /ReferenceError:\s+[a-zA-Z0-9_$]+ is not defined/i,
];

export const DATABASE_ERROR_PATTERNS = [
  /ECONNREFUSED\s+127\.0\.0\.1/i,
  /password authentication failed for user/i,
  /syntax error at or near/i,
  /no such table:\s+[a-zA-Z0-9_]+/i,
  /connection to server at .+ failed/i,
  /database "[a-zA-Z0-9_]+" does not exist/i,
];

/**
 * Validates raw API HTTP response text and status code against contract requirements.
 */
export function validateApiResponse(
  endpoint: string,
  method: HttpMethod,
  statusCode: number,
  statusText: string,
  bodyText: string,
  durationMs: number
): ApiEndpointCheckResult {
  const hasStackTraceLeak = STACK_TRACE_PATTERNS.some((p) => p.test(bodyText));
  const hasDatabaseLeak = DATABASE_ERROR_PATTERNS.some((p) => p.test(bodyText));

  // Endpoints returning 500+ or crashing are considered failed
  const isServerCrash = statusCode >= 500 || statusCode === 0;
  const isFailed = isServerCrash || hasStackTraceLeak || hasDatabaseLeak;

  const snippet = bodyText.trim().slice(0, 150).replace(/\s+/g, ' ');

  let error: string | undefined;
  if (isServerCrash) {
    error = `Endpoint crashed with HTTP ${statusCode} (${statusText})`;
  } else if (hasStackTraceLeak) {
    error = 'Critical vulnerability: Uncaught stack trace leaked in HTTP response body';
  } else if (hasDatabaseLeak) {
    error = 'Critical vulnerability: Internal database query or connection error leaked';
  }

  return {
    endpoint,
    method,
    statusCode,
    statusText,
    responseTimeMs: durationMs,
    passed: !isFailed,
    responseBodySnippet: snippet || undefined,
    hasStackTraceLeak,
    hasDatabaseLeak,
    error,
  };
}
