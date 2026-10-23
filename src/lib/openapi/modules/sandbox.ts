/**
 * OpenAPI Module: Sandbox & MicroVM Isolation
 *
 * Defines schemas and endpoints for managing rootless container isolation,
 * Linux cgroups v2 resource enforcement, and sandbox process quarantine.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const SANDBOX_SCHEMAS: Record<string, OpenApiSchema> = {
  SandboxMetrics: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['healthy', 'degraded', 'quarantined'], example: 'healthy' },
      cgroupsVersion: { type: 'string', example: 'v2' },
      activeSandboxesCount: { type: 'integer', example: 3 },
      memoryUsageBytes: { type: 'integer', example: 268435456 },
      memoryLimitBytes: { type: 'integer', example: 1073741824 },
      cpuQuotaPercent: { type: 'number', example: 25.4 },
    },
    required: ['status', 'cgroupsVersion', 'activeSandboxesCount'],
  },
};

export const SANDBOX_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/sandbox/status': {
    get: {
      tags: ['Sandbox'],
      summary: 'Inspect sandbox isolation metrics',
      description: 'Returns real-time Linux cgroups v2 resource utilization and container pool status.',
      operationId: 'getSandboxStatus',
      responses: {
        '200': {
          description: 'Current sandbox health and memory allocation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SandboxMetrics' },
            },
          },
        },
      },
    },
  },
};
