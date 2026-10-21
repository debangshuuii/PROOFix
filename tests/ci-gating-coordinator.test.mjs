import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CiGatingCoordinator,
  globalCiGatingCoordinator,
} from '../src/lib/integrations/ci-gating-coordinator.ts';

test('shouldGateMerge respects enabled events and config toggles', () => {
  const coord = new CiGatingCoordinator();
  const config = {
    provider: 'github',
    webhookSecret: 'safe_test_secret_for_config',
    enabledEvents: ['pull_request_opened', 'pull_request_synchronize'],
    autoTriggerVerification: true,
    autoCommentHealingPr: true,
  };

  const prEvent = {
    id: 'evt-1',
    provider: 'github',
    eventType: 'pull_request_opened',
    repository: { owner: 'acme', name: 'core', fullName: 'acme/core', cloneUrl: '', defaultBranch: 'main' },
    sender: { username: 'alice' },
    commitSha: 'c0ffee1234567890123456789012345678901234',
    branch: 'feat/checkout',
    timestamp: new Date().toISOString(),
  };

  assert.equal(coord.shouldGateMerge(prEvent, config), true);

  const pushEvent = { ...prEvent, eventType: 'push' };
  assert.equal(coord.shouldGateMerge(pushEvent, config), false);

  const disabledConfig = { ...config, autoTriggerVerification: false };
  assert.equal(coord.shouldGateMerge(prEvent, disabledConfig), false);
});

test('dispatchVerificationJob transitions into queued check run', () => {
  const coord = new CiGatingCoordinator();
  const event = {
    id: 'evt-2',
    provider: 'github',
    eventType: 'pull_request_opened',
    repository: { owner: 'acme', name: 'core', fullName: 'acme/core', cloneUrl: '', defaultBranch: 'main' },
    sender: { username: 'alice' },
    commitSha: 'beefbeef12345678901234567890123456789012',
    branch: 'feat/checkout',
    timestamp: new Date().toISOString(),
  };

  const dispatch = coord.dispatchVerificationJob(event, {
    provider: 'github',
    webhookSecret: 'safe_test_secret_for_config',
    enabledEvents: ['pull_request_opened'],
    autoTriggerVerification: true,
    autoCommentHealingPr: true,
  });

  assert.equal(dispatch.status, 'queued');
  assert.ok(dispatch.jobId.startsWith('ci-job-github-beefbeef'));

  const report = coord.getGatingReport(event.commitSha);
  assert.ok(report);
  assert.equal(report.gatingStatus, 'in_progress');
  assert.equal(report.checkRun.status, 'queued');
});

test('processExecutionCompletion updates check run and generates PR comment on failure', () => {
  const coord = new CiGatingCoordinator();
  const event = {
    id: 'evt-3',
    provider: 'github',
    eventType: 'pull_request_opened',
    repository: { owner: 'acme', name: 'core', fullName: 'acme/core', cloneUrl: '', defaultBranch: 'main' },
    sender: { username: 'alice' },
    commitSha: 'deadbeef12345678901234567890123456789012',
    branch: 'feat/pricing-table',
    pullRequestNumber: 77,
    timestamp: new Date().toISOString(),
  };

  const executionResult = {
    suiteName: 'Pricing Table E2E',
    totalTests: 4,
    passedCount: 3,
    failedCount: 1,
    skippedCount: 0,
    durationMs: 3500,
    commitSha: event.commitSha,
    branch: event.branch,
    performanceBudget: {
      lcpMs: 1400,
      cls: 0.01,
      memoryMb: 120,
      budgetExceeded: false,
    },
    failures: [
      {
        testId: 't-1',
        title: 'Select Enterprise Tier Button',
        filePath: 'tests/pricing.spec.ts',
        errorMessage: 'Button clicked did not open checkout drawer',
        diffSnippet: '- page.click(".btn-enterprise");\n+ page.click("[data-testid=\'tier-enterprise\']");',
      },
    ],
  };

  const report = coord.processExecutionCompletion(event, executionResult, {
    provider: 'github',
    webhookSecret: 'safe_test_secret_for_config',
    enabledEvents: ['pull_request_opened'],
    autoTriggerVerification: true,
    autoCommentHealingPr: true,
  });

  assert.equal(report.gatingStatus, 'blocked');
  assert.equal(report.checkRun.conclusion, 'failure');
  assert.ok(report.reviewComment);
  assert.equal(report.reviewComment.pullRequestNumber, 77);
  assert.ok(report.reviewComment.body.includes('1-Click Apply Self-Healing Patch'));
});
