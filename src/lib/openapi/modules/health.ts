/**
 * OpenAPI Module: Health & Readiness Probes
 *
 * Defines liveness and readiness probe endpoints for Kubernetes / Docker container orchestration.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const HEALTH_SCHEMAS: Record<string, OpenApiSchema> = {
  HealthStatus: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      timestamp: { type: 'string', format: 'date-time' },
      version: { type: 'string', example: '1.0.0' },
      uptimeSecs: { type: 'number', example: 86400 },
    },
    required: ['status', 'timestamp'],
  },
  ReadyStatus: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['ready', 'not_ready'], example: 'ready' },
      database: { type: 'string', example: 'connected' },
      databaseEngine: { type: 'string', enum: ['sqlite', 'postgres'], example: 'postgres' },
      workerPool: { type: 'string', example: 'active' },
    },
    required: ['status', 'database'],
  },
};

export const HEALTH_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/health': {
    get: {
      tags: ['Health'],
      summary: 'Liveness health check',
      description: 'Returns 200 OK if the PROOFix process is alive.',
      operationId: 'getHealth',
      responses: {
        '200': {
          description: 'Process is alive',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthStatus' },
            },
          },
        },
      },
    },
  },
  '/api/v1/ready': {
    get: {
      tags: ['Health'],
      summary: 'Readiness probe',
      description: 'Verifies database persistence layer and worker queues are ready to receive traffic.',
      operationId: 'getReadiness',
      responses: {
        '200': {
          description: 'All subsystems operational',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReadyStatus' },
            },
          },
        },
      },
    },
  },
};
