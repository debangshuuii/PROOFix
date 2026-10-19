import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';
import { encryptWebhookUrl, maskWebhookUrl } from '../src/lib/notifications/secret-vault.ts';
import { dispatchNotificationAsync } from '../src/lib/notifications/delivery-engine.ts';
import {
  computeDeduplicationKey,
  checkIsDuplicate,
  getDeliveryRecords,
  resetDeduplicationStore,
} from '../src/lib/notifications/deduplication.ts';

console.log('--- Testing Notification Deduplication & Status Tracking (Contribution 88) ---');

async function runDeduplicationSuite() {
  resetDeduplicationStore();

  const projectId = `proj_dedup_${Date.now()}`;
  const ownerId = 'usr_alice';

  const project = {
    id: projectId,
    ownerId,
    name: 'Deduplication Test App',
    description: 'Testing deduplication of retried CI jobs',
    repoUrl: 'https://github.com/test/dedup',
    repoProvider: 'sample_fixture',
    defaultBranch: 'main',
    config: {
      startupCommand: 'npm run start',
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      port: 3000,
      readinessPath: '/',
      timeoutSecs: 30,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.createProject(project);

  const fakeUrl = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_slack_webhook_token_123';
  const settings = {
    projectId,
    enabled: true,
    channels: [
      {
        id: 'ch_slack_dedup',
        channelType: 'slack',
        channelName: '#ci-alerts',
        enabled: true,
        webhookUrlEncrypted: encryptWebhookUrl(fakeUrl),
        webhookUrlMasked: maskWebhookUrl(fakeUrl),
        hasSecret: true,
        notifyOnEvents: ['run.failed', 'regression.detected'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    deliveryPreferences: {
      minSeverity: 'failures_only',
      includeReportLink: true,
      includeSummary: true,
    },
    updatedAt: new Date().toISOString(),
  };

  await db.saveProjectNotificationSettings(projectId, settings, ownerId);

  try {
    let mockFetchCalls = 0;
    const mockFetch = async () => {
      mockFetchCalls++;
      return new Response('ok', { status: 200 });
    };

    const initialEvent = {
      id: 'ev_job_failure_01',
      eventType: 'run.failed',
      projectId,
      projectName: project.name,
      runId: 'run_ci_retry_100',
      commitHash: 'a1b2c3d',
      summary: 'Build step failed',
      timestamp: new Date().toISOString(),
    };

    // 1. Initial Dispatch: Must deliver and record status
    const firstSummary = await dispatchNotificationAsync(initialEvent, {
      mockFetch,
    });
    assert.equal(firstSummary.deliveredCount, 1);
    assert.equal(mockFetchCalls, 1);

    const recordsAfterFirst = getDeliveryRecords(projectId);
    assert.equal(recordsAfterFirst.length, 1);
    assert.equal(recordsAfterFirst[0].status, 'delivered');
    console.log('[PASS] Initial event delivered and recorded in delivery status store.');

    // 2. Retry of the SAME event (e.g. CI retry of run_ci_retry_100):
    // "Done when: repeated event processing does not produce unintended duplicate notifications."
    const duplicateEvent = {
      ...initialEvent,
      id: 'ev_job_failure_01_retry', // New event wrapper from CI retry
    };

    const secondSummary = await dispatchNotificationAsync(duplicateEvent, {
      mockFetch,
    });

    assert.equal(
      mockFetchCalls,
      1,
      'Mock fetch must NOT be called again for duplicate job event'
    );
    assert.equal(secondSummary.deliveredCount, 0);
    assert.equal(secondSummary.skippedCount, 1);
    assert.ok(secondSummary.results[0].error.includes('duplicate'));
    console.log('[PASS] Repeated event processing safely detected duplicate and skipped delivery without re-posting.');

    // 3. Different Run or Event on same project: Delivers normally
    const newRunEvent = {
      id: 'ev_job_failure_02',
      eventType: 'run.failed',
      projectId,
      projectName: project.name,
      runId: 'run_ci_new_200', // Different run ID
      commitHash: 'e4f5a6b',
      summary: 'New run failed',
      timestamp: new Date().toISOString(),
    };

    const newRunSummary = await dispatchNotificationAsync(newRunEvent, {
      mockFetch,
    });
    assert.equal(newRunSummary.deliveredCount, 1);
    assert.equal(mockFetchCalls, 2);
    console.log('[PASS] Distinct run events deliver normally and are not falsely deduplicated.');

    // 4. Test notifications bypass deduplication
    const testEvent = {
      id: 'ev_test_notif',
      eventType: 'run.failed',
      projectId,
      projectName: project.name,
      summary: 'Manual test',
      timestamp: new Date().toISOString(),
      isTest: true,
    };

    await dispatchNotificationAsync(testEvent, { mockFetch });
    await dispatchNotificationAsync(testEvent, { mockFetch });
    assert.equal(mockFetchCalls, 4, 'Test notifications must bypass deduplication to permit repeated testing');
    console.log('[PASS] Test notifications bypass deduplication for developer convenience.');
  } finally {
    await db.deleteProject(projectId);
  }
}

runDeduplicationSuite()
  .then(() => {
    console.log('[ALL PASS] Contribution 88 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Deduplication test error:', err);
    process.exit(1);
  });
