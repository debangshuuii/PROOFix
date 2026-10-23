/**
 * OpenAPI Module: Findings & Test Results
 *
 * Defines schemas and endpoints for inspecting broken assertions,
 * console errors, network failures, and executing targeted test reruns.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const FINDING_SCHEMAS: Record<string, OpenApiSchema> = {
  Finding: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'fnd_auth_fail' },
      runId: { type: 'string', example: 'run_9876543210' },
      type: {
        type: 'string',
        enum: ['functional', 'security', 'accessibility', 'performance'],
        example: 'functional',
      },
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low', 'info'],
        example: 'high',
      },
      title: { type: 'string', example: 'MFA submit button unreachable' },
      description: { type: 'string', example: 'Timed out waiting for locator("button#mfa-submit")' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'runId', 'type', 'severity', 'title'],
  },
  TestResult: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'res_123' },
      runId: { type: 'string', example: 'run_9876543210' },
      name: { type: 'string', example: 'should complete checkout flow' },
      status: {
        type: 'string',
        enum: ['passed', 'failed', 'running', 'skipped'],
        example: 'passed',
      },
      durationMs: { type: 'integer', example: 4500 },
      error: { type: 'string' },
      evidence: {
        type: 'object',
        properties: {
          screenshotPath: { type: 'string' },
          videoPath: { type: 'string' },
          consoleErrorsCount: { type: 'integer' },
        },
      },
    },
    required: ['id', 'runId', 'name', 'status', 'durationMs'],
  },
};

export const FINDING_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/runs/{id}/findings': {
    get: {
      tags: ['Findings'],
      summary: 'List findings for run',
      description: 'Returns all detected functional regressions, security flaws, and accessibility findings.',
      operationId: 'getRunFindings',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Findings collection',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  findings: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Finding' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/runs/{id}/rerun-failed': {
    post: {
      tags: ['Runs'],
      summary: 'Rerun only failed test cases',
      description: 'Dispatches a targeted verification run isolating only the tests that failed in this run.',
      operationId: 'rerunFailedTests',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '201': {
          description: 'New rerun dispatched',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rerunId: { type: 'string', example: 'run_rerun_12345' },
                },
              },
            },
          },
        },
      },
    },
  },
};
