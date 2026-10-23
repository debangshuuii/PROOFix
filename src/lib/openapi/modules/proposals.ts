/**
 * OpenAPI Module: AI Fix Proposals & Self-Healing Engine
 *
 * Defines schemas and endpoints for generating, inspecting, and applying
 * autonomous AST-backed code patches and self-healing fixes.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const PROPOSAL_SCHEMAS: Record<string, OpenApiSchema> = {
  FixProposal: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'prop_mfa_123' },
      runId: { type: 'string', example: 'run_9876543210' },
      projectId: { type: 'string', example: 'prj_alpha123' },
      title: { type: 'string', example: 'Wait for modal transition before clicking #mfa-submit' },
      description: { type: 'string', example: 'Adds waitForSelector visible state prior to click' },
      confidenceScore: { type: 'number', minimum: 0, maximum: 1, example: 0.94 },
      targetFile: { type: 'string', example: 'src/components/auth/MfaModal.tsx' },
      patchDiff: { type: 'string', example: '--- a/src/Mfa.tsx\n+++ b/src/Mfa.tsx\n@@ -10,1 +10,2 @@' },
      status: {
        type: 'string',
        enum: ['proposed', 'applied', 'rejected'],
        example: 'proposed',
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'runId', 'title', 'confidenceScore', 'targetFile', 'patchDiff', 'status'],
  },
};

export const PROPOSAL_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/proposals': {
    get: {
      tags: ['Proposals'],
      summary: 'List AI fix proposals',
      description: 'Returns all generated fix proposals across test runs, sorted by confidence score.',
      operationId: 'listProposals',
      parameters: [
        {
          name: 'runId',
          in: 'query',
          required: false,
          description: 'Filter proposals by specific run ID',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Proposals list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  proposals: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FixProposal' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/proposals/{id}/apply': {
    post: {
      tags: ['Proposals'],
      summary: 'Apply AI fix patch',
      description: 'Applies the proposed unified git diff directly to the project repository workspace.',
      operationId: 'applyProposal',
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
          description: 'Patch successfully applied',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  appliedFile: { type: 'string', example: 'src/components/auth/MfaModal.tsx' },
                  commitHash: { type: 'string', example: 'c0ff3311' },
                },
              },
            },
          },
        },
      },
    },
  },
};
