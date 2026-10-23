/**
 * OpenAPI Module: Projects & Applications
 *
 * Defines schemas and path items for creating, listing, inspecting,
 * and deleting application projects and repositories.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const PROJECT_SCHEMAS: Record<string, OpenApiSchema> = {
  ProjectConfig: {
    type: 'object',
    properties: {
      startupCommand: { type: 'string', example: 'npm run dev' },
      buildCommand: { type: 'string', example: 'npm run build' },
      installCommand: { type: 'string', example: 'npm install' },
      port: { type: 'integer', example: 3000 },
      readinessPath: { type: 'string', example: '/' },
      timeoutSecs: { type: 'integer', example: 45 },
    },
    required: ['startupCommand', 'port'],
  },
  Project: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'prj_alpha123' },
      ownerId: { type: 'string', example: 'usr_default' },
      name: { type: 'string', example: 'Payment Gateway' },
      description: { type: 'string', example: 'Stripe webhook worker' },
      repoUrl: { type: 'string', example: 'https://github.com/org/payment-service' },
      repoProvider: { type: 'string', enum: ['github', 'gitlab', 'bitbucket', 'local'], example: 'github' },
      defaultBranch: { type: 'string', example: 'main' },
      localPath: { type: 'string', example: '/app/source' },
      config: { $ref: '#/components/schemas/ProjectConfig' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'defaultBranch', 'createdAt', 'updatedAt'],
  },
  CreateProjectRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Payment Gateway' },
      description: { type: 'string', example: 'Stripe webhook worker' },
      repoUrl: { type: 'string', example: 'https://github.com/org/payment-service' },
      defaultBranch: { type: 'string', default: 'main' },
      config: { $ref: '#/components/schemas/ProjectConfig' },
    },
    required: ['name'],
  },
};

export const PROJECT_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/projects': {
    get: {
      tags: ['Projects'],
      summary: 'List all active projects',
      description: 'Retrieves all projects owned by the authenticated tenant with their verification status.',
      operationId: 'listProjects',
      responses: {
        '200': {
          description: 'A list of active projects',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  projects: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Create a new project',
      description: 'Registers a new repository for automated verification and test synthesis.',
      operationId: 'createProject',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateProjectRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Project successfully registered',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  project: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/projects/{id}': {
    get: {
      tags: ['Projects'],
      summary: 'Get project details',
      description: 'Fetches detailed metadata, active runs, and commit histories for a project.',
      operationId: 'getProjectById',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique project identifier',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Project details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  project: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
      },
    },
  },
};
