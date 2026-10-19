import { db } from '../db/index.ts';
import type {
  NotificationChannelType,
  NotificationEventPayload,
  ProjectNotificationSettings,
  WebhookChannelConfig,
} from '../types/notification.ts';
import { isEventEligibleForDelivery } from './schema.ts';
import { decryptWebhookUrl, sanitizeWebhookLogs } from './secret-vault.ts';
import { formatSlackMessage } from './slack-adapter.ts';
import { formatDiscordMessage, handleDiscordApiResponse } from './discord-adapter.ts';
import {
  computeDeduplicationKey,
  checkIsDuplicate,
  recordDeliveryAttempt,
} from './deduplication.ts';
import { validateWebhookDestination } from './ssrf-guard.ts';

export interface DeliveryAttempt {
  attemptNumber: number;
  statusCode?: number;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ChannelDeliveryResult {
  channelId: string;
  channelType: NotificationChannelType;
  channelName?: string;
  success: boolean;
  attempts: DeliveryAttempt[];
  error?: string;
}

export interface DeliverySummary {
  eventId: string;
  projectId: string;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  results: ChannelDeliveryResult[];
  completedAt: string;
}

export interface DeliveryEngineOptions {
  maxAttempts?: number; // default: 3
  timeoutMs?: number; // default: 5000ms per attempt
  backoffBaseMs?: number; // default: 100ms
  mockFetch?: (url: string, init?: RequestInit) => Promise<Response>;
  sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates exponential backoff with jitter.
 */
export function calculateBackoffMs(
  attempt: number,
  baseMs: number = 100,
  maxMs: number = 5000
): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
  const jitter = Math.random() * (exp * 0.2); // Up to 20% jitter
  return Math.floor(exp + jitter);
}

/**
 * Dispatches an event to a single configured webhook channel with bounded retries and timeouts.
 */
async function deliverToChannel(
  event: NotificationEventPayload,
  channel: WebhookChannelConfig,
  options: DeliveryEngineOptions
): Promise<ChannelDeliveryResult> {
  const maxAttempts = options.maxAttempts || 3;
  const timeoutMs = options.timeoutMs || 5000;
  const backoffBaseMs = options.backoffBaseMs || 100;
  const fetchImpl = options.mockFetch || fetch;
  const sleep = options.sleepFn || defaultSleep;

  const attempts: DeliveryAttempt[] = [];

  if (!channel.webhookUrlEncrypted) {
    return {
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      success: false,
      attempts: [],
      error: 'Missing encrypted webhook secret.',
    };
  }

  let rawWebhookUrl: string;
  try {
    rawWebhookUrl = decryptWebhookUrl(channel.webhookUrlEncrypted);
  } catch (err: any) {
    return {
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      success: false,
      attempts: [],
      error: `Decryption error: ${err.message}`,
    };
  }

  // SSRF guard check
  const ssrfCheck = validateWebhookDestination(rawWebhookUrl, channel.channelType);
  if (!ssrfCheck.valid) {
    return {
      channelId: channel.id,
      channelType: channel.channelType,
      channelName: channel.channelName,
      success: false,
      attempts: [],
      error: `Blocked by SSRF policy: ${ssrfCheck.reason}`,
    };
  }

  // Prepare payload
  let payloadBody: string;
  if (channel.channelType === 'slack') {
    payloadBody = JSON.stringify(formatSlackMessage(event));
  } else {
    payloadBody = JSON.stringify(formatDiscordMessage(event));
  }

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(rawWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PROOFix-Webhook-Dispatcher/1.0',
        },
        body: payloadBody,
        signal: controller.signal,
        redirect: 'error',
      });

      clearTimeout(timer);
      const statusCode = response.status;
      const durationMs = Date.now() - startTime;

      let success = false;
      let shouldRetry = false;
      let attemptError: string | undefined;

      if (channel.channelType === 'discord') {
        const json = await response.json().catch(() => ({}));
        const discordRes = handleDiscordApiResponse(statusCode, json);
        success = discordRes.ok;
        shouldRetry = discordRes.shouldRetry;
        attemptError = discordRes.error;
      } else {
        // Slack
        if (statusCode === 200) {
          success = true;
        } else {
          success = false;
          // Retry on 5xx or 429
          shouldRetry = statusCode >= 500 || statusCode === 429;
          attemptError = `Slack returned HTTP ${statusCode}`;
        }
      }

      attempts.push({
        attemptNumber: attempt,
        statusCode,
        durationMs,
        success,
        error: attemptError,
        timestamp: new Date().toISOString(),
      });

      if (success) {
        return {
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName,
          success: true,
          attempts,
        };
      }

      lastError = attemptError;

      // Stop immediately if non-retryable (e.g. 400 Bad Request, 404 Webhook Deleted)
      if (!shouldRetry || attempt === maxAttempts) {
        break;
      }

      const backoffMs = calculateBackoffMs(attempt, backoffBaseMs);
      await sleep(backoffMs);
    } catch (err: any) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      const errorMsg = isTimeout
        ? `Request timed out after ${timeoutMs}ms.`
        : sanitizeWebhookLogs(err.message || 'Network failure');

      attempts.push({
        attemptNumber: attempt,
        durationMs,
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });

      lastError = errorMsg;

      if (attempt < maxAttempts) {
        const backoffMs = calculateBackoffMs(attempt, backoffBaseMs);
        await sleep(backoffMs);
      }
    }
  }

  return {
    channelId: channel.id,
    channelType: channel.channelType,
    channelName: channel.channelName,
    success: false,
    attempts,
    error: lastError || 'Delivery failed after all retry attempts.',
  };
}

/**
 * Dispatches a notification event outside the primary verification execution path.
 * "Done when: a delivery failure cannot change the underlying verification result or block completion indefinitely."
 */
export async function dispatchNotificationAsync(
  event: NotificationEventPayload,
  options: DeliveryEngineOptions = {}
): Promise<DeliverySummary> {
  const summary: DeliverySummary = {
    eventId: event.id,
    projectId: event.projectId,
    deliveredCount: 0,
    failedCount: 0,
    skippedCount: 0,
    results: [],
    completedAt: new Date().toISOString(),
  };

  try {
    const settings = await db.getProjectNotificationSettings(event.projectId);

    // If master switch disabled, skip all
    if (!settings.enabled && !event.isTest) {
      summary.skippedCount = settings.channels.length;
      return summary;
    }

    for (const channel of settings.channels) {
      const eligibility = isEventEligibleForDelivery(event, channel, settings);
      if (!eligibility.eligible) {
        summary.skippedCount++;
        continue;
      }

      // Check deduplication (test events bypass deduplication)
      const dedupKey = computeDeduplicationKey(event, channel.id);
      if (!event.isTest) {
        const dedupCheck = checkIsDuplicate(dedupKey);
        if (dedupCheck.isDuplicate) {
          summary.skippedCount++;
          summary.results.push({
            channelId: channel.id,
            channelType: channel.channelType,
            channelName: channel.channelName,
            success: true,
            attempts: [],
            error: 'Skipped duplicate alert: event was already delivered to this channel.',
          });
          continue;
        }
      }

      try {
        const result = await deliverToChannel(event, channel, options);
        summary.results.push(result);
        if (result.success) {
          summary.deliveredCount++;
          recordDeliveryAttempt({
            id: `del_${Date.now()}_${channel.id}`,
            deduplicationKey: dedupKey,
            eventId: event.id,
            projectId: event.projectId,
            channelId: channel.id,
            channelType: channel.channelType,
            status: 'delivered',
            attemptsCount: result.attempts.length,
            deliveredAt: new Date().toISOString(),
            lastAttemptAt: new Date().toISOString(),
          });
        } else {
          summary.failedCount++;
          recordDeliveryAttempt({
            id: `del_${Date.now()}_${channel.id}`,
            deduplicationKey: dedupKey,
            eventId: event.id,
            projectId: event.projectId,
            channelId: channel.id,
            channelType: channel.channelType,
            status: 'failed',
            attemptsCount: result.attempts.length,
            lastAttemptAt: new Date().toISOString(),
            error: result.error,
          });
        }
      } catch (err) {
        // Individual channel failure caught cleanly
        summary.failedCount++;
      }
    }
  } catch (err) {
    // Top-level failure never rethrown to caller to protect verification run status
    console.error('[PROOFix Notification Engine] Background dispatch error caught safely:', err);
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}
