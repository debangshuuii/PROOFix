/**
 * Test Suite: Failing Tests & AI Fix Proposals Indexing
 *
 * Verifies extraction, keyword parsing, confidence scoring,
 * and fuzzy query resolution for broken tests and AI remediation proposals.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FailureIndexer } from '../src/lib/navigation/failure-indexer.ts';
import { ProposalIndexer } from '../src/lib/navigation/proposal-indexer.ts';
import { EnterpriseEntityIndexer } from '../src/lib/navigation/enterprise-entity-indexer.ts';
import { CommandIndexer } from '../src/lib/navigation/command-indexer.ts';

describe('Failing Tests & AI Fix Proposal Indexing and Resolution', () => {
  const sampleFailures = [
    {
      id: 'fail-btn-login',
      runId: 'run-101',
      projectId: 'prj-web',
      projectName: 'Web Client',
      testName: 'should display MFA authentication modal on submit',
      suiteName: 'AuthFlowSpec',
      errorMessage: 'Error: Timed out 5000ms waiting for locator("button#mfa-submit")',
      stackSnippet: 'at Page.click (auth.spec.ts:45:12)',
      durationMs: 5120,
      failedAt: '2026-10-23T11:00:00Z',
    },
    {
      id: 'fail-api-500',
      runId: 'run-102',
      projectId: 'prj-api',
      projectName: 'API Gateway',
      testName: 'GET /v1/health should respond 200 OK',
      suiteName: 'HealthCheckSpec',
      errorMessage: 'Expected status 200 but received 500 Internal Server Error: Database pool timeout',
      stackSnippet: 'at testHealth (health.spec.ts:18:9)',
      durationMs: 1420,
      failedAt: '2026-10-23T11:05:00Z',
    },
  ];

  const sampleProposals = [
    {
      id: 'prop-mfa-fix',
      runId: 'run-101',
      projectId: 'prj-web',
      projectName: 'Web Client',
      testName: 'should display MFA authentication modal on submit',
      title: 'Wait for modal transition before clicking #mfa-submit',
      description: 'Add waitForSelector visible state prior to attempting click action',
      confidenceScore: 0.94,
      targetFile: 'src/components/auth/MfaModal.tsx',
      status: 'proposed',
      createdAt: '2026-10-23T11:02:00Z',
    },
    {
      id: 'prop-db-fix',
      runId: 'run-102',
      projectId: 'prj-api',
      projectName: 'API Gateway',
      title: 'Increase idle timeout on PostgreSQL connection pool',
      description: 'Set idleTimeoutMillis to 30000ms to avoid cold acquire dropping',
      confidenceScore: 0.88,
      targetFile: 'src/lib/database/connection-pool.ts',
      status: 'applied',
      createdAt: '2026-10-23T11:08:00Z',
    },
  ];

  test('should map failing test to command action with flame icon and error details', () => {
    const action = FailureIndexer.mapFailureToCommandAction(sampleFailures[0]);

    assert.equal(action.id, 'failure-fail-btn-login');
    assert.ok(action.title.includes('Failing Test: should display MFA'));
    assert.equal(action.category, 'failures');
    assert.equal(action.href, '/projects/prj-web/runs/run-101?tab=failures');
    assert.equal(action.badge, 'FAILING TEST');
    assert.equal(action.status, 'failed');
    assert.ok(action.keywords.includes('locator'));
    assert.ok(action.keywords.includes('timeout'));
  });

  test('should map AI proposal to command action with confidence badge', () => {
    const action = ProposalIndexer.mapProposalToCommandAction(sampleProposals[0]);

    assert.equal(action.id, 'proposal-prop-mfa-fix');
    assert.ok(action.title.includes('AI Fix: Wait for modal'));
    assert.equal(action.category, 'proposals');
    assert.equal(action.href, '/projects/prj-web/runs/run-101?tab=proposals');
    assert.equal(action.badge, '94% CONF');
    assert.equal(action.status, 'proposed');
    assert.ok(action.keywords.includes('patch'));
    assert.ok(action.keywords.includes('remediation'));
  });

  test('should search and isolate failures and proposals via CommandIndexer', () => {
    const indexer = new CommandIndexer([]);
    indexer.indexFailures(sampleFailures);
    indexer.indexProposals(sampleProposals);

    // Search by error message snippet
    const errorMatches = indexer.search('timeout');
    assert.ok(errorMatches.length >= 1);
    assert.ok(errorMatches.some((m) => m.category === 'failures'));

    // Search by target file in proposal
    const fileMatches = indexer.search('connection-pool');
    assert.ok(fileMatches.length >= 1);
    assert.equal(fileMatches[0].category, 'proposals');

    // Filter by category
    const failureFilter = indexer.search('', 'failures');
    assert.equal(failureFilter.length, 2);

    const proposalFilter = indexer.search('', 'proposals');
    assert.equal(proposalFilter.length, 2);
  });
});
