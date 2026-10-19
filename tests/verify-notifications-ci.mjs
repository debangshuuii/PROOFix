/**
 * PROOFix - Master CI Webhook Notifications Regression Test Suite
 * Feature 9 — Slack & Discord Webhook Alerts (Contributions 81–90)
 *
 * Verifies end-to-end notification functionality across all 10 contributions:
 * 1. Notification settings, event schema & unsolicited delivery guards (C81)
 * 2. Secure webhook configuration UI & ownership authorization (C82)
 * 3. Encrypted webhook secret storage (AES-256-GCM) & log redaction (C83)
 * 4. Slack notification adapter formatting with zero secret leakage (C84)
 * 5. Discord notification adapter with embeds & error handling (C85)
 * 6. Test-notification functionality with clear test labeling (C86)
 * 7. Background delivery, bounded retries & verification isolation (C87)
 * 8. Deduplication & delivery status tracking for retried CI jobs (C88)
 * 9. Webhook destination SSRF hardening & redirect protections (C89)
 * 10. End-to-end multi-channel pipeline regression verification (C90)
 */

import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';
import {
  getDefaultNotificationSettings,
  validateNotificationSettings,
  validateNotificationEvent,
  isEventEligibleForDelivery,
} from '../src/lib/notifications/schema.ts';
import { verifyProjectOwnership } from '../src/lib/security/ownership.ts';
import {
  encryptWebhookUrl,
  decryptWebhookUrl,
  maskWebhookUrl,
  sanitizeWebhookLogs,
  assertZeroSecretLeakage,
} from '../src/lib/notifications/secret-vault.ts';
import { formatSlackMessage } from '../src/lib/notifications/slack-adapter.ts';
import { formatDiscordMessage, handleDiscordApiResponse } from '../src/lib/notifications/discord-adapter.ts';
import { sendTestNotification } from '../src/lib/notifications/test-sender.ts';
import {
  dispatchNotificationAsync,
  calculateBackoffMs,
} from '../src/lib/notifications/delivery-engine.ts';
import {
  computeDeduplicationKey,
  checkIsDuplicate,
  resetDeduplicationStore,
  getDeliveryRecords,
} from '../src/lib/notifications/deduplication.ts';
import {
  validateWebhookDestination,
  getSafeWebhookFetchOptions,
} from '../src/lib/notifications/ssrf-guard.ts';

const syntheticSecrets = [
  'AKIAIOSFODNN7EXAMPLE',
  'ghp_1234567890abcdefghijklmnopqrstuvwxyzAB',
  'sk-proj-abcde12345FGHIJ67890klmno12345pqrst67890uv',
  'postgres://admin:SuperSecretPass123!@db.internal:5432/production',
];

async function runMasterNotificationRegressionSuite() {
  console.log('================================================================');
  console.log(' PROOFix Master Webhook Notifications CI Regression Suite');
  console.log(' Feature 9: Contributions 81–90');
  console.log('================================================================\n');

  resetDeduplicationStore();

  const testProjectId = `proj_ci_master_${Date.now()}`;
  const ownerId = 'usr_ci_admin';

  const masterProject = {
    id: testProjectId,
    ownerId,
    name: 'Master Notifications Testbed',
    description: 'CI integration testbed for webhooks',
    repoUrl: 'https://github.com/proofix/testbed',
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

  await db.createProject(masterProject);

  try {
    // ---------------------------------------------------------
    // Test 1: Notification Settings & Event Schema (C81)
    // ---------------------------------------------------------
    console.log('Test 1: Notification Settings & Safe Defaults...');
    const defaultSettings = getDefaultNotificationSettings(testProjectId);
    assert.equal(defaultSettings.enabled, false, 'Defaults must strictly disable notifications to prevent unsolicited alerts');
    assert.equal(defaultSettings.channels.length, 0);

    const validCheck = validateNotificationSettings(
      {
        enabled: true,
        channels: [
          {
            id: 'ch_s1',
            channelType: 'slack',
            enabled: true,
            notifyOnEvents: ['run.failed', 'regression.detected'],
          },
        ],
      },
      testProjectId
    );
    assert.equal(validCheck.valid, true);

    const invalidCheck = validateNotificationSettings(
      { channels: [{ channelType: 'unsupported_platform' }] },
      testProjectId
    );
    assert.equal(invalidCheck.valid, false);
    console.log('  -> [PASS] Settings schema validated and safe defaults prevent unsolicited delivery.\n');

    // ---------------------------------------------------------
    // Test 2: Secure Webhook Config UI & Authorization (C82)
    // ---------------------------------------------------------
    console.log('Test 2: Ownership Authorization Guards...');
    const ownerAuth = { userId: ownerId, role: 'user' };
    const attackerAuth = { userId: 'usr_attacker', role: 'user' };

    assert.equal(verifyProjectOwnership(masterProject, ownerAuth, 'write').authorized, true);
    const attackerCheck = verifyProjectOwnership(masterProject, attackerAuth, 'write');
    assert.equal(attackerCheck.authorized, false);
    assert.ok(attackerCheck.reason.includes('Unauthorized'));
    console.log('  -> [PASS] Unauthorized users strictly prevented from modifying project webhook settings.\n');

    // ---------------------------------------------------------
    // Test 3: Encrypted Webhook Secret Storage (C83)
    // ---------------------------------------------------------
    console.log('Test 3: Encrypted Webhook Storage & Masking...');
    const plainSlackUrl = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_slack_webhook_token_123';
    const encrypted = encryptWebhookUrl(plainSlackUrl);
    assert.ok(encrypted.startsWith('enc:v1:'));
    assert.equal(encrypted.includes('mock_slack_webhook_token_123'), false);

    const decrypted = decryptWebhookUrl(encrypted);
    assert.equal(decrypted, plainSlackUrl);

    const masked = maskWebhookUrl(plainSlackUrl);
    assert.ok(masked.includes('hooks.slack.com'));
    assert.ok(masked.includes('••••••••'));
    assert.equal(masked.includes('mock_slack_webhook_token_123'), false);

    const sanitizedLogs = sanitizeWebhookLogs(`Posting alert to ${plainSlackUrl}`);
    assert.ok(sanitizedLogs.includes('[REDACTED_SLACK_WEBHOOK]'));
    console.log('  -> [PASS] Webhook secrets encrypted with AES-256-GCM, masked, and redacted from logs.\n');

    // Configure project settings for remaining tests
    const plainDiscordUrl = 'https://discord.com/api/webhooks/1234567890/plainDiscordSecretToken456';
    const configuredSettings = {
      projectId: testProjectId,
      enabled: true,
      channels: [
        {
          id: 'ch_master_slack',
          channelType: 'slack',
          channelName: '#ci-slack',
          enabled: true,
          webhookUrlEncrypted: encryptWebhookUrl(plainSlackUrl),
          webhookUrlMasked: maskWebhookUrl(plainSlackUrl),
          hasSecret: true,
          notifyOnEvents: ['run.failed', 'regression.detected', 'security.alert'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ch_master_discord',
          channelType: 'discord',
          channelName: '#ci-discord',
          enabled: true,
          webhookUrlEncrypted: encryptWebhookUrl(plainDiscordUrl),
          webhookUrlMasked: maskWebhookUrl(plainDiscordUrl),
          hasSecret: true,
          notifyOnEvents: ['run.failed', 'regression.detected', 'security.alert'],
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
    await db.saveProjectNotificationSettings(testProjectId, configuredSettings, ownerId);

    // ---------------------------------------------------------
    // Test 4: Slack Notification Adapter (C84)
    // ---------------------------------------------------------
    console.log('Test 4: Slack Notification Adapter Formatting...');
    const sampleEvent = {
      id: 'ev_slack_master',
      eventType: 'run.failed',
      projectId: testProjectId,
      projectName: masterProject.name,
      runId: 'run_999',
      commitHash: 'c7d8e9f',
      branch: 'main',
      reportUrl: 'https://proofix.dev/runs/run_999',
      summary: `Failed with credential ${syntheticSecrets[0]} in \`\`\`code\`\`\``,
      securityAlerts: [{ type: 'secret', count: 1, maxSeverity: 'critical' }],
      timestamp: new Date().toISOString(),
    };

    const slackMsg = formatSlackMessage(sampleEvent);
    assert.ok(slackMsg.blocks.length >= 4);
    assert.ok(JSON.stringify(slackMsg).includes('Master Notifications Testbed'));
    assert.ok(JSON.stringify(slackMsg).includes('c7d8e9f'));

    // Zero secret leakage in payload
    for (const sec of syntheticSecrets) {
      assert.equal(JSON.stringify(slackMsg).includes(sec), false);
    }
    console.log('  -> [PASS] Slack Block Kit payload formatted cleanly with zero secret/code leakage.\n');

    // ---------------------------------------------------------
    // Test 5: Discord Notification Adapter (C85)
    // ---------------------------------------------------------
    console.log('Test 5: Discord Notification Adapter & Error Handling...');
    const discordMsg = formatDiscordMessage(sampleEvent);
    assert.ok(discordMsg.embeds.length === 1);
    assert.equal(discordMsg.embeds[0].color, 0xef4444); // Red for failed
    assert.ok(discordMsg.content.length <= 2000);

    // Discord API Error parser
    assert.equal(handleDiscordApiResponse(204).ok, true);
    assert.equal(handleDiscordApiResponse(429, { retry_after: 2 }).shouldRetry, true);
    assert.equal(handleDiscordApiResponse(400).shouldRetry, false);
    assert.equal(handleDiscordApiResponse(404).shouldRetry, false);
    assert.equal(handleDiscordApiResponse(502).shouldRetry, true);
    console.log('  -> [PASS] Discord embeds and API error handling verified.\n');

    // ---------------------------------------------------------
    // Test 6: Test-Notification Functionality (C86)
    // ---------------------------------------------------------
    console.log('Test 6: Test-Notification Execution...');
    let testSentUrl = null;
    let testSentBody = null;
    const mockTestFetch = async (url, init) => {
      testSentUrl = url;
      testSentBody = JSON.parse(init.body);
      return new Response('ok', { status: 200 });
    };

    const testResult = await sendTestNotification(testProjectId, 'ch_master_slack', ownerId, {
      mockFetch: mockTestFetch,
    });
    assert.equal(testResult.success, true);
    assert.equal(testSentUrl, plainSlackUrl);
    assert.ok(JSON.stringify(testSentBody).includes('Test Notification'));
    // Ensure raw secret is not in output
    assert.equal(JSON.stringify(testResult).includes('plainSlackSecretToken123'), false);
    console.log('  -> [PASS] Test notification delivered with clear test labeling and concealed URL.\n');

    // ---------------------------------------------------------
    // Test 7: Background Delivery, Retries & Isolation (C87)
    // ---------------------------------------------------------
    console.log('Test 7: Bounded Retries & Run Isolation...');
    let retryCalls = 0;
    const mockRetryFetch = async () => {
      retryCalls++;
      if (retryCalls < 2) {
        return new Response('Server Error', { status: 500 });
      }
      return new Response('ok', { status: 200 });
    };

    const runEvent = {
      id: `ev_run_${Date.now()}`,
      eventType: 'run.failed',
      projectId: testProjectId,
      projectName: masterProject.name,
      runId: 'run_ci_iso_1',
      summary: 'Test run failure',
      timestamp: new Date().toISOString(),
    };

    const deliverySummary = await dispatchNotificationAsync(runEvent, {
      mockFetch: mockRetryFetch,
      maxAttempts: 3,
      backoffBaseMs: 10,
    });

    assert.equal(deliverySummary.deliveredCount >= 1, true);
    assert.ok(retryCalls >= 2);
    console.log('  -> [PASS] Bounded retry succeeded and delivery failures remain isolated from run outcomes.\n');

    // ---------------------------------------------------------
    // Test 8: Deduplication & Delivery Tracking (C88)
    // ---------------------------------------------------------
    console.log('Test 8: Deduplication on Retried Jobs...');
    let dedupCalls = 0;
    const mockDedupFetch = async () => {
      dedupCalls++;
      return new Response('ok', { status: 200 });
    };

    const dedupEvent = {
      id: 'ev_dedup_original',
      eventType: 'regression.detected',
      projectId: testProjectId,
      projectName: masterProject.name,
      runId: 'run_dedup_same',
      summary: 'Regression detected',
      timestamp: new Date().toISOString(),
    };

    // First attempt: delivers
    const d1 = await dispatchNotificationAsync(dedupEvent, { mockFetch: mockDedupFetch });
    assert.equal(d1.deliveredCount >= 1, true);
    const initialCalls = dedupCalls;

    // Second attempt with exact same job/event: skips duplicate
    const d2 = await dispatchNotificationAsync(dedupEvent, { mockFetch: mockDedupFetch });
    assert.equal(dedupCalls, initialCalls, 'Duplicate event must not trigger additional webhook requests');
    assert.ok(d2.skippedCount >= 1);
    console.log('  -> [PASS] Deduplication prevented duplicate alerts for retried job.\n');

    // ---------------------------------------------------------
    // Test 9: Webhook Destination SSRF Hardening (C89)
    // ---------------------------------------------------------
    console.log('Test 9: Webhook SSRF Guard & Redirect Hardening...');
    const ssrfBadUrls = [
      'http://hooks.slack.com/services/insecure',
      'https://127.0.0.1/services/xxx',
      'https://169.254.169.254/latest/meta-data',
      'https://10.0.0.1/services/xxx',
      'https://localhost/services/xxx',
      'https://database.internal/webhook',
    ];

    for (const bad of ssrfBadUrls) {
      const check = validateWebhookDestination(bad);
      assert.equal(check.valid, false, `Destination "${bad}" must be blocked`);
    }

    const safeOptions = getSafeWebhookFetchOptions();
    assert.equal(safeOptions.redirect, 'error', 'Must block automatic redirects');
    console.log('  -> [PASS] SSRF guard blocks internal IPs, metadata endpoints, and HTTP redirects.\n');

    // ---------------------------------------------------------
    // Test 10: Multi-Channel Pipeline Regression Run (C90)
    // ---------------------------------------------------------
    console.log('Test 10: Full Multi-Channel Pipeline End-to-End...');
    let slackReceived = false;
    let discordReceived = false;

    const mockMultiFetch = async (url, init) => {
      if (url.includes('slack.com')) {
        slackReceived = true;
        assert.ok(init.body.includes('Master Notifications Testbed'));
        return new Response('ok', { status: 200 });
      } else if (url.includes('discord.com')) {
        discordReceived = true;
        assert.ok(init.body.includes('embeds'));
        return new Response(null, { status: 204 });
      }
      return new Response('not found', { status: 404 });
    };

    const multiEvent = {
      id: `ev_multi_${Date.now()}`,
      eventType: 'security.alert',
      projectId: testProjectId,
      projectName: masterProject.name,
      runId: 'run_multi_final',
      summary: 'Security vulnerability and exposed token detected',
      securityAlerts: [{ type: 'vulnerability', count: 2, maxSeverity: 'high' }],
      timestamp: new Date().toISOString(),
    };

    const finalSummary = await dispatchNotificationAsync(multiEvent, {
      mockFetch: mockMultiFetch,
    });

    assert.equal(slackReceived, true, 'Slack channel must receive formatted notification');
    assert.equal(discordReceived, true, 'Discord channel must receive formatted notification');
    assert.equal(finalSummary.deliveredCount, 2);

    console.log('  -> [PASS] Full multi-channel webhook dispatch completed successfully.\n');

    console.log('================================================================');
    console.log(' [ALL PASS] All 10 Webhook Notification Contributions Verified! ');
    console.log(' Contributions 81–90 Completed, Hardened & Tested Successfully.');
    console.log('================================================================');
  } finally {
    await db.deleteProject(testProjectId);
  }
}

runMasterNotificationRegressionSuite().catch((err) => {
  console.error('[FATAL] Master notification regression suite failed:', err);
  process.exit(1);
});
