/**
 * OpenAPI Module: Autonomous Route Crawler & Discovery
 *
 * Defines schemas and endpoints for dispatching automated web crawlers
 * to discover untested client-side routes, dynamic forms, and API endpoints.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const CRAWLER_SCHEMAS: Record<string, OpenApiSchema> = {
  CrawlerJob: {
    type: 'object',
    properties: {
      jobId: { type: 'string', example: 'crw_12345' },
      baseUrl: { type: 'string', example: 'http://localhost:3000' },
      discoveredRoutesCount: { type: 'integer', example: 18 },
      status: { type: 'string', enum: ['in_progress', 'completed', 'failed'], example: 'completed' },
      routes: {
        type: 'array',
        items: { type: 'string' },
        example: ['/', '/dashboard', '/projects', '/settings', '/sandbox'],
      },
    },
    required: ['jobId', 'baseUrl', 'status'],
  },
};

export const CRAWLER_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/crawler/start': {
    post: {
      tags: ['Crawler'],
      summary: 'Start autonomous route crawler',
      description: 'Crawls local application to extract interactive buttons, inputs, and deep routes.',
      operationId: 'startCrawler',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                projectId: { type: 'string' },
                maxDepth: { type: 'integer', default: 3 },
              },
              required: ['projectId'],
            },
          },
        },
      },
      responses: {
        '202': {
          description: 'Crawl job scheduled',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CrawlerJob' },
            },
          },
        },
      },
    },
  },
};
