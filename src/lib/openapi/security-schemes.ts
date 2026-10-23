/**
 * OpenAPI Security Schemes & Standard Response Components
 *
 * Defines authentication mechanisms (JWT Bearer, API Keys, Multi-tenant headers)
 * and shared HTTP status response definitions across the REST surface.
 */

import type { OpenApiResponse } from '../types/openapi.ts';

export const OPENAPI_SECURITY_SCHEMES = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Enterprise JWT authentication token acquired via SSO or OAuth2 flow.',
  },
  ApiKeyAuth: {
    type: 'apiKey',
    in: 'header',
    name: 'X-PROOFix-Api-Key',
    description: 'Autonomous CLI & CI/CD pipeline automation key.',
  },
  TenantScope: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Tenant-ID',
    description: 'Multi-tenant organization boundary selector.',
  },
};

export const STANDARD_RESPONSES: Record<string, OpenApiResponse> = {
  BadRequest: {
    description: 'Invalid input parameters or malformed payload syntax',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid project configuration' },
            details: { type: 'array', items: { type: 'string' } },
          },
          required: ['error'],
        },
      },
    },
  },
  Unauthorized: {
    description: 'Authentication token or API key missing or expired',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Missing X-PROOFix-Api-Key or Bearer token' },
          },
          required: ['error'],
        },
      },
    },
  },
  NotFound: {
    description: 'The requested entity could not be located in tenant partition',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
          },
          required: ['error'],
        },
      },
    },
  },
  InternalServerError: {
    description: 'Unexpected server exception occurred during execution',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Database connection pool exhausted' },
          },
          required: ['error'],
        },
      },
    },
  },
};
