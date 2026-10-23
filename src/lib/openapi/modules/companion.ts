/**
 * OpenAPI Module: Live Developer Companion & WebRTC Signaling
 *
 * Defines schemas and endpoints for real-time sub-millisecond DOM observation,
 * cursor synchronization, and browser interaction streaming during sandbox execution.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const COMPANION_SCHEMAS: Record<string, OpenApiSchema> = {
  CompanionSession: {
    type: 'object',
    properties: {
      sessionId: { type: 'string', example: 'comp_sess_991' },
      runId: { type: 'string', example: 'run_9876543210' },
      signalingChannel: { type: 'string', example: 'webrtc-peer-alpha' },
      activeViewersCount: { type: 'integer', example: 1 },
      status: { type: 'string', enum: ['connecting', 'connected', 'closed'], example: 'connected' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['sessionId', 'runId', 'signalingChannel', 'status'],
  },
  SignalingPayload: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['offer', 'answer', 'candidate'], example: 'offer' },
      sdp: { type: 'string', example: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1...' },
      candidate: { type: 'string' },
    },
    required: ['type'],
  },
};

export const COMPANION_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/companion/session': {
    post: {
      tags: ['Companion'],
      summary: 'Initiate live companion session',
      description: 'Allocates a WebRTC signaling channel to mirror browser canvas during run execution.',
      operationId: 'createCompanionSession',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                runId: { type: 'string' },
              },
              required: ['runId'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Companion session initiated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CompanionSession' },
            },
          },
        },
      },
    },
  },
};
