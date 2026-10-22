/**
 * Backend API Verification & Payload Contract Agent Schemas
 * Models multi-method API endpoint discovery, HTTP request fuzzing payloads,
 * status assertions, and error leak detection.
 */

import type { HttpMethod } from './api-fuzzing.ts';

export interface ApiEndpointConfig {
  path: string;
  methods: HttpMethod[];
  timeoutMs: number;
  expectedStatusMin: number;
  expectedStatusMax: number;
  allowEmptyBody: boolean;
  detectStackTraces: boolean;
  detectDatabaseErrors: boolean;
  headers?: Record<string, string>;
}

export interface SyntheticPayload {
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  queryParams?: Record<string, string>;
}

export interface ApiEndpointCheckResult {
  endpoint: string;
  method: HttpMethod;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  passed: boolean;
  responseBodySnippet?: string;
  hasStackTraceLeak: boolean;
  hasDatabaseLeak: boolean;
  error?: string;
}

export interface ApiVerificationSummary {
  totalEndpointsDiscovered: number;
  totalChecksExecuted: number;
  passedChecksCount: number;
  failedChecksCount: number;
  results: ApiEndpointCheckResult[];
}
