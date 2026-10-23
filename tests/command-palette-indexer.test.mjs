/**
 * Test Suite: Project and Run Fuzzy Indexing & Scoring
 *
 * Verifies transformation of active projects and test execution runs
 * into indexed command actions, along with fuzzy match scoring and category filtering.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectIndexer } from '../src/lib/navigation/project-indexer.ts';
import { RunIndexer } from '../src/lib/navigation/run-indexer.ts';
import { CommandIndexer } from '../src/lib/navigation/command-indexer.ts';

describe('Project & Run Entity Indexing and Ranking', () => {
  const sampleProjects = [
    {
      id: 'prj-alpha',
      name: 'Authentication Service',
      description: 'OAuth2 and JWT token validation service',
      defaultBranch: 'main',
      lastRunStatus: 'passed',
      activeRunsCount: 2,
      updatedAt: '2026-10-23T10:00:00Z',
    },
    {
      id: 'prj-beta',
      name: 'Payment Gateway',
      description: 'Stripe webhook and checkout session worker',
      defaultBranch: 'feature/checkout',
      lastRunStatus: 'failed',
      activeRunsCount: 1,
      updatedAt: '2026-10-23T10:30:00Z',
    },
  ];

  const sampleRuns = [
    {
      id: 'run-9876543210',
      projectId: 'prj-alpha',
      projectName: 'Authentication Service',
      status: 'passed',
      branch: 'main',
      commitHash: 'a1b2c3d4e5f6',
      testCount: 42,
      passedCount: 42,
      failedCount: 0,
      durationMs: 3450,
      createdAt: '2026-10-23T10:05:00Z',
    },
    {
      id: 'run-1234567890',
      projectId: 'prj-beta',
      projectName: 'Payment Gateway',
      status: 'failed',
      branch: 'feature/checkout',
      commitHash: 'f6e5d4c3b2a1',
      testCount: 30,
      passedCount: 28,
      failedCount: 2,
      durationMs: 8200,
      createdAt: '2026-10-23T10:35:00Z',
    },
  ];

  test('should map project entity to command action with proper badge and route', () => {
    const action = ProjectIndexer.mapProjectToCommandAction(sampleProjects[0]);

    assert.equal(action.id, 'project-prj-alpha');
    assert.equal(action.title, 'Authentication Service');
    assert.equal(action.category, 'projects');
    assert.equal(action.href, '/projects/prj-alpha');
    assert.equal(action.badge, 'PASSED');
    assert.equal(action.status, 'passed');
    assert.ok(action.keywords.includes('project'));
    assert.ok(action.keywords.includes('oauth2'));
  });

  test('should map run entity to command action with short ID and stats', () => {
    const action = RunIndexer.mapRunToCommandAction(sampleRuns[0]);

    assert.equal(action.id, 'run-run-9876543210');
    assert.ok(action.title.includes('Run #run-9876'));
    assert.equal(action.category, 'runs');
    assert.equal(action.href, '/projects/prj-alpha/runs/run-9876543210');
    assert.equal(action.badge, 'PASSED');
    assert.ok(action.subtitle.includes('42/42 passed'));
    assert.ok(action.subtitle.includes('3.5s'));
  });

  test('should dynamically search projects and runs in CommandIndexer', () => {
    const indexer = new CommandIndexer([]);
    indexer.indexProjects(sampleProjects);
    indexer.indexRuns(sampleRuns);

    // Search for payment
    const paymentResults = indexer.search('payment');
    assert.ok(paymentResults.length >= 1);
    assert.equal(paymentResults[0].title, 'Payment Gateway');

    // Search by commit hash in metadata
    const hashResults = indexer.search('a1b2c3d');
    assert.ok(hashResults.length >= 1);
    assert.equal(hashResults[0].category, 'runs');

    // Search with category filter
    const runsOnly = indexer.search('', 'runs');
    assert.equal(runsOnly.length, 2);
    assert.ok(runsOnly.every((r) => r.category === 'runs'));

    const projectsOnly = indexer.search('', 'projects');
    assert.equal(projectsOnly.length, 2);
    assert.ok(projectsOnly.every((p) => p.category === 'projects'));
  });
});
