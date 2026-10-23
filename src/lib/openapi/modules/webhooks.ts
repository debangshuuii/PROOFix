/**
 * OpenAPI Module: Outbound Webhooks & Notifications
 *
 * Defines schemas and endpoints for dispatching automated webhook alerts
 * on run pass/fail and AI proposal generation events.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const WEBHOOK_SCHEMAS: Record<string, OpenApiSchema> = {
  WebhookSubscription: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'whk_slack_alerts' },
      url: { type: 'string', example: 'https://hooks.slack.com/services/T00/B00/X00' },
      events: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['run.completed', 'run.failed', 'proposal.created'],
        },
        example: ['run.failed', 'proposal.created'],
      },
      secret: { type: 'string', example: 'whsec_xyz123' },
      enabled: { type: 'boolean', default: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'url', 'events', 'enabled'],
  },
};

export const WEBHOOK_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/webhooks': {
    get: {
      tags: ['Webhooks'],
      summary: 'List registered webhooks',
      description: 'Returns outbound webhooks configured for this tenant.',
      operationId: 'listWebhooks',
      responses: {
        '200': {
          description: 'Webhook configurations',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  webhooks: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/WebhookSubscription' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
