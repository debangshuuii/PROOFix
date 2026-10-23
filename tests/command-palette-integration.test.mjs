/**
 * Test Suite: Command Palette Dynamic Fuzzy Search Integration
 *
 * Validates cross-entity fuzzy search indexing across active projects,
 * recent runs, failing tests, and AI fix proposals alongside static enterprise commands.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CommandIndexer, DEFAULT_COMMAND_ACTIONS } from '../src/lib/navigation/command-indexer.ts';
import { PaletteApiLoader } from '../src/lib/navigation/palette-api-loader.ts';

describe('Global Command Palette Dynamic Fuzzy Search Integration', () => {
  const mockBundle = {
    projects: [
      {
        id: 'prj-alpha',
        name: 'Billing Platform',
        description: 'Stripe customer invoicing and checkout flows',
        defaultBranch: 'main',
        lastRunStatus: 'passed',
        activeRunsCount: 1,
        updatedAt: '2026-10-23T11:00:00Z',
      },
      {
        id: 'prj-beta',
        name: 'Identity & Access Manager',
        description: 'OIDC provider, SAML 2.0 federation and RBAC',
        defaultBranch: 'main',
        lastRunStatus: 'failed',
        activeRunsCount: 2,
        updatedAt: '2026-10-23T11:15:00Z',
      },
    ],
    runs: [
      {
        id: 'run-8877665544',
        projectId: 'prj-alpha',
        projectName: 'Billing Platform',
        status: 'passed',
        branch: 'main',
        commitHash: 'c4d5e6f7',
        testCount: 50,
        passedCount: 50,
        failedCount: 0,
        durationMs: 4120,
        createdAt: '2026-10-23T11:05:00Z',
      },
      {
        id: 'run-1122334455',
        projectId: 'prj-beta',
        projectName: 'Identity & Access Manager',
        status: 'failed',
        branch: 'feature/saml',
        commitHash: 'e7f8a1b2',
        testCount: 65,
        passedCount: 62,
        failedCount: 3,
        durationMs: 9800,
        createdAt: '2026-10-23T11:20:00Z',
      },
    ],
    failingTests: [
      {
        id: 'fail-saml-cert',
        runId: 'run-1122334455',
        projectId: 'prj-beta',
        projectName: 'Identity & Access Manager',
        testName: 'validate SAML IdP metadata x509 certificate expiry',
        suiteName: 'SamlFederationSpec',
        errorMessage: 'AssertionError: Expected cert not to be expired by 2026-10-23',
        durationMs: 1250,
        failedAt: '2026-10-23T11:21:00Z',
      },
    ],
    proposals: [
      {
        id: 'prop-saml-renew',
        runId: 'run-1122334455',
        projectId: 'prj-beta',
        projectName: 'Identity & Access Manager',
        testName: 'validate SAML IdP metadata x509 certificate expiry',
        title: 'Auto-renew test fixture x509 certificate for 365 days',
        description: 'Generate self-signed testing cert fixture in fixtures/saml-idp.pem',
        confidenceScore: 0.96,
        targetFile: 'tests/fixtures/saml-idp.pem',
        status: 'proposed',
        createdAt: '2026-10-23T11:22:00Z',
      },
    ],
  };

  test('should ingest full dynamic bundle and index alongside default actions', () => {
    const indexer = new CommandIndexer(DEFAULT_COMMAND_ACTIONS);
    indexer.ingestBundle(mockBundle);

    const counts = indexer.getEntityIndexer().getCounts();
    assert.equal(counts.projects, 2);
    assert.equal(counts.runs, 2);
    assert.equal(counts.failures, 1);
    assert.equal(counts.proposals, 1);
    assert.equal(counts.total, 6);

    const all = indexer.search('');
    assert.equal(all.length, DEFAULT_COMMAND_ACTIONS.length + 6);
  });

  test('should resolve cross-entity fuzzy queries with accurate relevance ranking', () => {
    const indexer = new CommandIndexer(DEFAULT_COMMAND_ACTIONS);
    indexer.ingestBundle(mockBundle);

    // 1. Static action query
    const sandboxResults = indexer.search('sandbox');
    assert.ok(sandboxResults.length > 0);
    assert.equal(sandboxResults[0].id, 'nav-sandbox');

    // 2. Project query
    const billingResults = indexer.search('billing');
    assert.ok(billingResults.length > 0);
    assert.equal(billingResults[0].id, 'project-prj-alpha');
    assert.equal(billingResults[0].category, 'projects');

    // 3. Run query by shortId
    const runResults = indexer.search('88776655');
    assert.ok(runResults.length > 0);
    assert.equal(runResults[0].id, 'run-run-8877665544');
    assert.equal(runResults[0].category, 'runs');

    // 4. Failing test query by error keyword
    const certResults = indexer.search('certificate');
    assert.ok(certResults.length > 0);
    assert.ok(certResults.some((r) => r.category === 'failures'));

    // 5. AI proposal query by targetFile
    const proposalResults = indexer.search('saml-idp.pem');
    assert.ok(proposalResults.length > 0);
    assert.equal(proposalResults[0].id, 'proposal-prop-saml-renew');
    assert.equal(proposalResults[0].category, 'proposals');
  });

  test('should verify category filtering isolates requested domain entities only', () => {
    const indexer = new CommandIndexer(DEFAULT_COMMAND_ACTIONS);
    indexer.ingestBundle(mockBundle);

    const projectMatches = indexer.search('saml', 'projects');
    assert.equal(projectMatches.length, 1);
    assert.equal(projectMatches[0].title, 'Identity & Access Manager');

    const failureMatches = indexer.search('saml', 'failures');
    assert.equal(failureMatches.length, 1);
    assert.equal(failureMatches[0].category, 'failures');

    const proposalMatches = indexer.search('saml', 'proposals');
    assert.equal(proposalMatches.length, 1);
    assert.equal(proposalMatches[0].category, 'proposals');
  });
});
