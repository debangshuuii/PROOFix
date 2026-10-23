/**
 * OpenAPI Module: Enterprise Governance & SOC2 Compliance
 *
 * Defines schemas and endpoints for inspecting the SHA-256 tamper-evident
 * audit trail and exporting compliance evidence bundles for Vanta/Drata auditors.
 */

import type { OpenApiPathItem, OpenApiSchema } from '../../types/openapi.ts';

export const GOVERNANCE_SCHEMAS: Record<string, OpenApiSchema> = {
  GovernanceLedgerEntry: {
    type: 'object',
    properties: {
      sequenceNumber: { type: 'integer', example: 1042 },
      timestamp: { type: 'string', format: 'date-time' },
      actor: { type: 'string', example: 'usr_sarah_lead' },
      action: { type: 'string', example: 'VERIFICATION_RUN_DISPATCHED' },
      resourceId: { type: 'string', example: 'run_9876543210' },
      sha256Hash: { type: 'string', example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      previousHash: { type: 'string', example: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb' },
    },
    required: ['sequenceNumber', 'timestamp', 'actor', 'action', 'sha256Hash'],
  },
};

export const GOVERNANCE_PATHS: Record<string, OpenApiPathItem> = {
  '/api/v1/governance/ledger': {
    get: {
      tags: ['Governance'],
      summary: 'Query immutable audit ledger',
      description: 'Fetches cryptographic audit records verifying run authenticity and integrity.',
      operationId: 'getAuditLedger',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 50 },
        },
      ],
      responses: {
        '200': {
          description: 'Verified ledger records',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  entries: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/GovernanceLedgerEntry' },
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
