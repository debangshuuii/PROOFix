/**
 * OpenAPI Module: Deterministic Mock Replay & Traffic Capture
 *
 * Defines schemas and endpoints for capturing outbound HTTP traffic during runs
 * and replaying it deterministically without third-party network flakiness.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const REPLAY_SCHEMAS: Record<string, OpenApiSchema> = {
  ReplaySession: {
    type: 'object',
    properties: {
      sessionId: { type: 'string', example: 'rep_sess_1024' },
      runId: { type: 'string', example: 'run_9876543210' },
      capturedRequestsCount: { type: 'integer', example: 14 },
      mode: { type: 'string', enum: ['record', 'replay', 'passthrough'], example: 'replay' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['sessionId', 'runId', 'mode'],
  },
};

export const REPLAY_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/replay/session': {
    post: {
      tags: ['Replay'],
      summary: 'Create or configure network replay session',
      description: 'Activates network interception proxy to mock third-party API dependencies.',
      operationId: 'createReplaySession',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                runId: { type: 'string' },
                mode: { type: 'string', enum: ['record', 'replay', 'passthrough'] },
              },
              required: ['runId', 'mode'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Replay session configured',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReplaySession' },
            },
          },
        },
      },
    },
  },
};
