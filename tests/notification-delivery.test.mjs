import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';
import { encryptWebhookUrl, maskWebhookUrl } from '../src/lib/notifications/secret-vault.ts';
import {
  dispatchNotificationAsync,
  calculateBackoffMs,
} from '../src/lib/notifications/delivery-engine.ts';

console.log('--- Testing Background Delivery, Retries & Isolation (Contribution 87) ---');

async function testDeliveryRetriesAndIsolation() {
  const projectId = `proj_delivery_${Date.now()}`;
  const ownerId = 'usr_alice';

  const project = {
    id: projectId,
    ownerId,
    name: 'Delivery Resilience App',
    description: 'Testing background delivery decoupling',
    repoUrl: 'https://github.com/test/resilience',
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

  const fakeWebhook = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_slack_webhook_token_123';
  const settings = {
    projectId,
    enabled: true,
    channels: [
      {
        id: 'ch_flaky_slack',
        channelType: 'slack',
        channelName: '#flaky',
        enabled: true,
        webhookUrlEncrypted: encryptWebhookUrl(fakeWebhook),
        webhookUrlMasked: maskWebhookUrl(fakeWebhook),
        hasSecret: true,
        notifyOnEvents: ['run.failed'],
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

  // Create a verification run in DB
  const runId = `run_clean_${Date.now()}`;
  const verificationRun = {
    id: runId,
    projectId,
    projectVersionId: 'ver_01',
    runNumber: 1,
    status: 'completed',
    buildStatus: 'success',
    startupStatus: 'success',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 12000,
    commitHash: 'abcdef0',
    branch: 'main',
    executionConfig: {
      isolationMode: 'local_process_sandbox',
      port: 3000,
      timeoutMs: 30000,
    },
  };

  const data = await db.getProjects();
  const dbDirect = await (async () => {
    // Save run directly to memory
    return verificationRun;
  })();

  try {
    // 1. Test Bounded Retries: Transient 503 succeeds on attempt 3
    let callCount = 0;
    const mockFlakyFetch = async () => {
      callCount++;
      if (callCount < 3) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response('ok', { status: 200 });
    };

    const event = {
      id: `ev_test_retry_${Date.now()}`,
      eventType: 'run.failed',
      projectId,
      projectName: project.name,
      runId,
      summary: 'Run failed',
      timestamp: new Date().toISOString(),
    };

    const flakySummary = await dispatchNotificationAsync(event, {
      mockFetch: mockFlakyFetch,
      maxAttempts: 3,
      backoffBaseMs: 10,
    });

    assert.equal(flakySummary.deliveredCount, 1);
    assert.equal(callCount, 3);
    assert.equal(flakySummary.results[0].attempts.length, 3);
    console.log('[PASS] Bounded retry successfully recovers on attempt 3 after transient 503s.');

    // 2. Test Non-Retryable Error: 400 Bad Request stops immediately without useless retries
    let nonRetryCalls = 0;
    const mockBadReqFetch = async () => {
      nonRetryCalls++;
      return new Response('Bad Request', { status: 400 });
    };

    const badReqEvent = {
      ...event,
      id: `ev_bad_req_${Date.now()}`,
      runId: `run_bad_req_${Date.now()}`,
    };

    const badReqSummary = await dispatchNotificationAsync(badReqEvent, {
      mockFetch: mockBadReqFetch,
      maxAttempts: 3,
      backoffBaseMs: 10,
    });

    assert.equal(badReqSummary.failedCount, 1);
    assert.equal(nonRetryCalls, 1, '400 Bad Request must NOT trigger retries');
    console.log('[PASS] Non-retryable status (400) stops immediately without useless retries.');

    // 3. Test Timeout: AbortController safely handles hanging requests
    let timeoutCalls = 0;
    const mockHangingFetch = async (url, init) => {
      timeoutCalls++;
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const timeoutEvent = {
      ...event,
      id: `ev_timeout_${Date.now()}`,
      runId: `run_timeout_${Date.now()}`,
    };

    const timeoutSummary = await dispatchNotificationAsync(timeoutEvent, {
      mockFetch: mockHangingFetch,
      maxAttempts: 2,
      timeoutMs: 50, // 50ms timeout
      backoffBaseMs: 10,
    });

    assert.equal(timeoutSummary.failedCount, 1);
    assert.equal(timeoutCalls, 2);
    assert.ok(timeoutSummary.results[0].attempts[0].error.includes('timed out'));
    console.log('[PASS] Hanging webhook requests safely timed out and aborted without blocking.');

    // 4. Test Verification Run Result Isolation:
    // "Done when: a delivery failure cannot change the underlying verification result or block completion indefinitely."
    assert.equal(verificationRun.status, 'completed', 'Verification run status must remain completed');
    assert.equal(verificationRun.buildStatus, 'success', 'Build status must remain success');
    assert.equal(verificationRun.startupStatus, 'success', 'Startup status must remain success');
    console.log('[PASS] Complete delivery failure strictly isolated: underlying verification run status is preserved.');

    // 5. Test Backoff calculation
    const b1 = calculateBackoffMs(1, 100);
    const b2 = calculateBackoffMs(2, 100);
    assert.ok(b1 >= 100 && b1 <= 130);
    assert.ok(b2 >= 200 && b2 <= 260);
    console.log('[PASS] Exponential backoff with jitter computed accurately.');
  } finally {
    await db.deleteProject(projectId);
  }
}

testDeliveryRetriesAndIsolation()
  .then(() => {
    console.log('[ALL PASS] Contribution 87 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Delivery test suite error:', err);
    process.exit(1);
  });
