/**
 * OpenAPI Module: Runs & Real-time Log Streaming
 *
 * Defines schemas and endpoints for dispatching test runs, querying run status,
 * cancelling active executions, and subscribing to live SSE log streams.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const RUN_SCHEMAS: Record<string, OpenApiSchema> = {
  VerificationRun: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'run_9876543210' },
      projectId: { type: 'string', example: 'prj_alpha123' },
      status: {
        type: 'string',
        enum: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled'],
        example: 'running',
      },
      branch: { type: 'string', example: 'main' },
      commitHash: { type: 'string', example: 'a1b2c3d4e5f6' },
      testCount: { type: 'integer', example: 42 },
      passedCount: { type: 'integer', example: 40 },
      failedCount: { type: 'integer', example: 2 },
      durationMs: { type: 'integer', example: 12450 },
      logs: {
        type: 'array',
        items: { type: 'string' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'projectId', 'status', 'createdAt', 'updatedAt'],
  },
  TriggerRunRequest: {
    type: 'object',
    properties: {
      branch: { type: 'string', default: 'main' },
      commitHash: { type: 'string' },
      customCommand: { type: 'string' },
      headless: { type: 'boolean', default: true },
    },
  },
};

export const RUN_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/runs/{id}': {
    get: {
      tags: ['Runs'],
      summary: 'Get verification run details',
      description: 'Returns execution progress, pass/fail counts, duration, and findings for a run.',
      operationId: 'getRunById',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique run identifier',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Run details and metrics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  run: { $ref: '#/components/schemas/VerificationRun' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/runs/{id}/cancel': {
    post: {
      tags: ['Runs'],
      summary: 'Cancel active verification run',
      description: 'Immediately kills the sandbox container and marks the run as cancelled.',
      operationId: 'cancelRun',
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
          description: 'Run successfully aborted',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/runs/{id}/stream': {
    get: {
      tags: ['Runs'],
      summary: 'Subscribe to live SSE log stream',
      description: 'Server-Sent Events connection streaming ANSI stdout/stderr lines as they occur.',
      operationId: 'streamRunLogs',
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
          description: 'Real-time event stream',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                description: 'data: {"type":"log","message":"[INFO] Step 1"}\n\n',
              },
            },
          },
        },
      },
    },
  },
};
