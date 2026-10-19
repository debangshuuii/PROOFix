import { db } from '../db/index.ts';
import { verifyProjectOwnership } from '../security/ownership.ts';
import type { NotificationEventPayload, NotificationChannelType } from '../types/notification.ts';
import { decryptWebhookUrl } from './secret-vault.ts';
import { formatSlackMessage } from './slack-adapter.ts';
import { formatDiscordMessage, handleDiscordApiResponse } from './discord-adapter.ts';
import { validateWebhookDestination } from './ssrf-guard.ts';

export interface TestNotificationResult {
  success: boolean;
  channelId: string;
  channelType: NotificationChannelType;
  channelName?: string;
  statusCode?: number;
  message: string;
  error?: string;
}

export interface TestSenderOptions {
  mockFetch?: (url: string, init?: RequestInit) => Promise<Response>;
}

/**
 * Sends a clearly labeled test notification to verify a webhook configuration.
 * "Done when: success and failure are reported accurately without exposing the webhook URL."
 */
export async function sendTestNotification(
  projectId: string,
  channelId: string,
  requesterUserId: string = 'usr_default',
  options: TestSenderOptions = {}
): Promise<TestNotificationResult> {
  const project = await db.getProjectById(projectId);
  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }

  // Verify ownership
  const authContext = {
    userId: requesterUserId,
    role: requesterUserId === 'admin' ? ('admin' as const) : ('user' as const),
  };
  const auth = verifyProjectOwnership(project, authContext, 'write');
  if (!auth.authorized) {
    throw new Error(
      auth.reason || `Unauthorized: User "${requesterUserId}" cannot trigger test notifications.`
    );
  }

  const settings = await db.getProjectNotificationSettings(projectId, requesterUserId);
  const channel = settings.channels.find((c) => c.id === channelId);
  if (!channel) {
    throw new Error(`Notification channel with ID "${channelId}" not found in project settings.`);
  }

  if (!channel.webhookUrlEncrypted) {
    return {
      success: false,
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      message: 'No encrypted webhook secret configured for this channel.',
      error: 'Missing webhook secret',
    };
  }

  // Decrypt secret internally (never exposed in output)
  let rawWebhookUrl: string;
  try {
    rawWebhookUrl = decryptWebhookUrl(channel.webhookUrlEncrypted);
  } catch (err: any) {
    return {
      success: false,
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      message: 'Failed to decrypt webhook URL from vault.',
      error: 'Secret decryption error',
    };
  }

  // SSRF guard validation before making network requests
  const ssrfCheck = validateWebhookDestination(rawWebhookUrl, channel.channelType);
  if (!ssrfCheck.valid) {
    return {
      success: false,
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      message: `Webhook destination rejected by security policy: ${ssrfCheck.reason}`,
      error: 'Blocked destination (SSRF protection)',
    };
  }

  // Construct clearly labeled test event
  const testEvent: NotificationEventPayload = {
    id: `ev_test_${Date.now()}`,
    eventType: 'run.completed',
    projectId: project.id,
    projectName: project.name,
    runNumber: 1,
    summary: 'This is a test notification from PROOFix to verify your webhook delivery pipeline.',
    timestamp: new Date().toISOString(),
    isTest: true,
  };

  let payloadBody: string;
  if (channel.channelType === 'slack') {
    const slackPayload = formatSlackMessage(testEvent);
    payloadBody = JSON.stringify(slackPayload);
  } else {
    const discordPayload = formatDiscordMessage(testEvent);
    payloadBody = JSON.stringify(discordPayload);
  }

  const fetchImpl = options.mockFetch || fetch;

  try {
    const response = await fetchImpl(rawWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PROOFix-Webhook-Dispatcher/1.0',
      },
      body: payloadBody,
      redirect: 'error',
    });

    const statusCode = response.status;

    if (channel.channelType === 'discord') {
      const respJson = await response.json().catch(() => ({}));
      const discordResult = handleDiscordApiResponse(statusCode, respJson);
      if (discordResult.ok) {
        return {
          success: true,
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName,
          statusCode,
          message: 'Test notification delivered successfully to Discord.',
        };
      } else {
        return {
          success: false,
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName,
          statusCode,
          message: discordResult.error || `Discord webhook rejected request with status ${statusCode}.`,
          error: discordResult.error,
        };
      }
    } else {
      // Slack returns "ok" text on success (status 200)
      if (statusCode === 200) {
        return {
          success: true,
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName,
          statusCode,
          message: 'Test notification delivered successfully to Slack.',
        };
      } else {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName,
          statusCode,
          message: `Slack webhook rejected request with status ${statusCode}: ${errorText || 'Unknown error'}.`,
          error: `HTTP ${statusCode}`,
        };
      }
    }
  } catch (err: any) {
    // Crucial: sanitize error message so the webhook URL is never leaked!
    const sanitizedMsg = err.message ? err.message.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]') : 'Network failure';
    return {
      success: false,
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      message: `Failed sending test notification: ${sanitizedMsg}`,
      error: sanitizedMsg,
    };
  }
}
