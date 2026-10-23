/**
 * OpenAPI Module: Autonomous API Fuzzing & Contract Probes
 *
 * Defines schemas and endpoints for fuzzing REST APIs, boundary probe tests,
 * and vulnerability scanning across endpoints.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const FUZZING_SCHEMAS: Record<string, OpenApiSchema> = {
  FuzzingFinding: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'fuzz_overflow_01' },
      endpoint: { type: 'string', example: '/api/v1/users' },
      method: { type: 'string', example: 'POST' },
      payloadType: { type: 'string', example: 'integer_overflow' },
      statusCode: { type: 'integer', example: 500 },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], example: 'high' },
      reproductionCurl: { type: 'string', example: 'curl -X POST http://localhost:3000/api/v1/users -d \'{"id": 9999999999999999999}\'' },
    },
    required: ['id', 'endpoint', 'method', 'statusCode', 'severity'],
  },
};

export const FUZZING_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/fuzzing/probe': {
    post: {
      tags: ['Fuzzing'],
      summary: 'Trigger API boundary fuzzing probe',
      description: 'Executes automated parameter mutations, SQLi, and boundary stress tests against target REST routes.',
      operationId: 'triggerFuzzingProbe',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                projectId: { type: 'string' },
                targetUrl: { type: 'string', example: 'http://localhost:3000/api/v1' },
                fuzzCategories: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['overflow', 'sqli', 'type_confusion'],
                },
              },
              required: ['projectId', 'targetUrl'],
            },
          },
        },
      },
      responses: {
        '202': {
          description: 'Fuzzing audit dispatched',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobId: { type: 'string', example: 'fuzz_job_7788' },
                  status: { type: 'string', example: 'running' },
                },
              },
            },
          },
        },
      },
    },
  },
};
