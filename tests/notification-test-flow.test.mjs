import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';
import { encryptWebhookUrl, maskWebhookUrl } from '../src/lib/notifications/secret-vault.ts';
import { sendTestNotification } from '../src/lib/notifications/test-sender.ts';

console.log('--- Testing Test-Notification Functionality (Contribution 86) ---');

const rawSlackUrl = 'https://hooks.slack.com/services/T111/B222/secretTokenSlack999';
const rawDiscordUrl = 'https://discord.com/api/webhooks/111222333444/secretTokenDiscord888';

async function runTestNotificationSuite() {
  const testProjectId = `proj_test_notif_${Date.now()}`;
  const ownerUserId = 'usr_tester_alice';

  const testProject = {
    id: testProjectId,
    ownerId: ownerUserId,
    name: 'Notification Test Project',
    description: 'Project for test notification flow',
    repoUrl: 'https://github.com/test/repo',
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

  await db.createProject(testProject);

  const testSettings = {
    projectId: testProjectId,
    enabled: true,
    channels: [
      {
        id: 'ch_test_slack',
        channelType: 'slack',
        channelName: '#test-slack',
        enabled: true,
        webhookUrlEncrypted: encryptWebhookUrl(rawSlackUrl),
        webhookUrlMasked: maskWebhookUrl(rawSlackUrl),
        hasSecret: true,
        notifyOnEvents: ['run.failed'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ch_test_discord',
        channelType: 'discord',
        channelName: '#test-discord',
        enabled: true,
        webhookUrlEncrypted: encryptWebhookUrl(rawDiscordUrl),
        webhookUrlMasked: maskWebhookUrl(rawDiscordUrl),
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

  await db.saveProjectNotificationSettings(testProjectId, testSettings, ownerUserId);

  try {
    // 1. Successful Slack test notification
    let lastSlackBody = null;
    let lastSlackUrl = null;
    const mockSlackFetch = async (url, init) => {
      lastSlackUrl = url;
      lastSlackBody = JSON.parse(init.body);
      return new Response('ok', { status: 200 });
    };

    const slackResult = await sendTestNotification(testProjectId, 'ch_test_slack', ownerUserId, {
      mockFetch: mockSlackFetch,
    });

    assert.equal(slackResult.success, true);
    assert.equal(slackResult.channelType, 'slack');
    assert.ok(slackResult.message.includes('successfully'));
    // Verify payload is clearly labeled as a test
    assert.ok(lastSlackBody.blocks.some((b) => JSON.stringify(b).includes('Test Notification')));
    // Verify decrypted URL was used for the request
    assert.equal(lastSlackUrl, rawSlackUrl);

    // Verify response does NOT expose the raw webhook URL:
    // "Done when: success and failure are reported accurately without exposing the webhook URL."
    const slackResJson = JSON.stringify(slackResult);
    assert.equal(slackResJson.includes('secretTokenSlack999'), false, 'Response must never leak raw token');
    console.log('[PASS] Slack test notification succeeds with clear test label and zero URL exposure.');

    // 2. Successful Discord test notification
    let lastDiscordBody = null;
    const mockDiscordFetch = async (url, init) => {
      lastDiscordBody = JSON.parse(init.body);
      return new Response(null, { status: 204 });
    };

    const discordResult = await sendTestNotification(testProjectId, 'ch_test_discord', ownerUserId, {
      mockFetch: mockDiscordFetch,
    });

    assert.equal(discordResult.success, true);
    assert.equal(discordResult.channelType, 'discord');
    assert.ok(lastDiscordBody.embeds[0].title.includes('Test Notification'));

    const discordResJson = JSON.stringify(discordResult);
    assert.equal(discordResJson.includes('secretTokenDiscord888'), false);
    console.log('[PASS] Discord test notification succeeds with embed test label and zero URL exposure.');

    // 3. Provider error reporting without leaking webhook URL
    const mockFailedFetch = async () => {
      return new Response(JSON.stringify({ code: 10015, message: 'Unknown Webhook' }), { status: 404 });
    };

    const failResult = await sendTestNotification(testProjectId, 'ch_test_discord', ownerUserId, {
      mockFetch: mockFailedFetch,
    });

    assert.equal(failResult.success, false);
    assert.equal(failResult.statusCode, 404);
    assert.ok(failResult.message.includes('404 Not Found') || failResult.message.includes('invalid'));
    // Verify raw secret is absent from failure message
    assert.equal(JSON.stringify(failResult).includes('secretTokenDiscord888'), false);
    console.log('[PASS] Webhook failure reported accurately without leaking webhook URL or secrets.');

    // 4. Unauthorized user cannot trigger test notification
    let unauthorizedCaught = false;
    try {
      await sendTestNotification(testProjectId, 'ch_test_slack', 'usr_mallory_attacker');
    } catch (err) {
      unauthorizedCaught = true;
      assert.ok(err.message.includes('Unauthorized'));
    }
    assert.equal(unauthorizedCaught, true, 'Unauthorized user must be rejected from sending test notifications');
    console.log('[PASS] Unauthorized users strictly prevented from dispatching test notifications.');
  } finally {
    await db.deleteProject(testProjectId);
  }
}

runTestNotificationSuite()
  .then(() => {
    console.log('[ALL PASS] Contribution 86 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Test notification suite error:', err);
    process.exit(1);
  });
