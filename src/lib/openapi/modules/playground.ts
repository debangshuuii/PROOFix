/**
 * OpenAPI Module: Zero-Setup Interactive Demo Playground
 *
 * Defines OpenAPI 3.1 schemas and endpoints for listing demo scenarios,
 * launching 1-click sandbox simulations, and auto-applying self-healing fixes.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const PLAYGROUND_SCHEMAS: Record<string, OpenApiSchema> = {
  DemoScenario: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'ecommerce_checkout' },
      title: { type: 'string', example: 'E-Commerce Broken Checkout & Missing Route' },
      subtitle: { type: 'string', example: 'Order submission click hangs + backend /api/checkout returns 404' },
      description: { type: 'string', example: 'Simulates store checkout flow with dead link detection.' },
      category: {
        type: 'string',
        enum: ['functional_e2e', 'framework_react', 'security_preflight'],
        example: 'functional_e2e',
      },
      badge: { type: 'string', example: 'Cart & API 404' },
      difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'], example: 'Beginner' },
      tags: { type: 'array', items: { type: 'string' }, example: ['Playwright', 'Click Interaction'] },
    },
    required: ['id', 'title', 'category', 'difficulty', 'tags'],
  },
  PlaygroundLaunchRequest: {
    type: 'object',
    properties: {
      scenarioId: { type: 'string', example: 'ecommerce_checkout' },
      mockMode: { type: 'boolean', default: true },
      autoApplyFix: { type: 'boolean', default: false },
      telemetryDelayMs: { type: 'integer', default: 600 },
    },
    required: ['scenarioId'],
  },
  PlaygroundApplyFixRequest: {
    type: 'object',
    properties: {
      scenarioId: { type: 'string', example: 'ecommerce_checkout' },
      runId: { type: 'string', example: 'run-demo-ecommerce-checkout-live-123' },
    },
    required: ['scenarioId', 'runId'],
  },
};

export const PLAYGROUND_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/playground/scenarios': {
    get: {
      tags: ['Playground'],
      summary: 'List Interactive Demo Scenarios',
      description: 'Retrieve all pre-configured zero-setup defect scenarios with category filtering.',
      operationId: 'listPlaygroundScenarios',
      parameters: [
        {
          name: 'category',
          in: 'query',
          description: 'Filter by scenario category (functional_e2e, framework_react, security_preflight)',
          schema: { type: 'string' },
        },
        {
          name: 'q',
          in: 'query',
          description: 'Fuzzy keyword search across title, defect headline, and tags',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Scenarios listed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  count: { type: 'integer' },
                  scenarios: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/DemoScenario' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/playground/scenarios/{id}': {
    get: {
      tags: ['Playground'],
      summary: 'Get Demo Scenario Details',
      description: 'Retrieve full specification, fault signatures, and patch diff for a demo scenario.',
      operationId: 'getPlaygroundScenarioById',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Demo scenario identifier (e.g. ecommerce_checkout)',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Scenario detail retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  scenario: { $ref: '#/components/schemas/DemoScenario' },
                },
              },
            },
          },
        },
        '404': { description: 'Scenario not found' },
      },
    },
  },
  '/api/v1/playground/launch': {
    post: {
      tags: ['Playground'],
      summary: 'Launch Demo Simulation Run',
      description: 'Provision an isolated sandbox project and launch the 11-stage verification run.',
      operationId: 'launchPlaygroundRun',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PlaygroundLaunchRequest' },
          },
        },
      },
      responses: {
        '200': { description: 'Simulation launched with run URL' },
        '400': { description: 'Invalid scenarioId' },
      },
    },
  },
  '/api/v1/playground/apply-fix': {
    post: {
      tags: ['Playground'],
      summary: 'Apply Patch and Verify Fix',
      description: 'Atomically apply AI patch diff and synthesize verified post-patch run with 100% green tests.',
      operationId: 'applyPlaygroundFix',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PlaygroundApplyFixRequest' },
          },
        },
      },
      responses: {
        '200': { description: 'Fix applied and verified' },
        '400': { description: 'Invalid parameters' },
      },
    },
  },
  '/api/v1/playground/reset': {
    post: {
      tags: ['Playground'],
      summary: 'Reset Scenario State',
      description: 'Reset demo scenario project and baseline run back to pristine initial state.',
      operationId: 'resetPlaygroundScenario',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { scenarioId: { type: 'string' } },
              required: ['scenarioId'],
            },
          },
        },
      },
      responses: {
        '200': { description: 'Scenario reset successfully' },
      },
    },
  },
};
