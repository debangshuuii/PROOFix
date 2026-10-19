import type {
  DeliveryPreferences,
  DeliverySeverityFilter,
  NotificationChannelType,
  NotificationEventPayload,
  NotificationEventType,
  ProjectNotificationSettings,
  WebhookChannelConfig,
} from '../types/notification.ts';

export const SUPPORTED_NOTIFICATION_EVENTS: readonly NotificationEventType[] = [
  'run.started',
  'run.completed',
  'run.failed',
  'regression.detected',
  'security.alert',
] as const;

export const SUPPORTED_NOTIFICATION_CHANNELS: readonly NotificationChannelType[] = [
  'slack',
  'discord',
] as const;

export const DEFAULT_DELIVERY_PREFERENCES: DeliveryPreferences = {
  minSeverity: 'failures_only',
  includeReportLink: true,
  includeSummary: true,
};

/**
 * Generates default project notification settings.
 * Master enabled is FALSE by default to strictly ensure defaults NEVER send unsolicited notifications.
 */
export function getDefaultNotificationSettings(projectId: string): ProjectNotificationSettings {
  return {
    projectId,
    enabled: false,
    channels: [],
    deliveryPreferences: { ...DEFAULT_DELIVERY_PREFERENCES },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates project-level notification settings and applies safe defaults.
 * "Done when: configuration is validated and defaults do not send unsolicited notifications."
 */
export function validateNotificationSettings(
  input: unknown,
  projectId: string
): { valid: boolean; settings?: ProjectNotificationSettings; errors: string[] } {
  const errors: string[] = [];

  if (!projectId || typeof projectId !== 'string') {
    errors.push('A valid projectId is required.');
  }

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Settings configuration must be a valid object.'],
    };
  }

  const raw = input as Record<string, unknown>;

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : false;

  // Validate delivery preferences
  const rawPref = (raw.deliveryPreferences as Record<string, unknown>) || {};
  const validSeverities: DeliverySeverityFilter[] = ['all', 'failures_only', 'regressions_only'];
  const minSeverity: DeliverySeverityFilter = validSeverities.includes(
    rawPref.minSeverity as DeliverySeverityFilter
  )
    ? (rawPref.minSeverity as DeliverySeverityFilter)
    : 'failures_only';

  const includeReportLink =
    typeof rawPref.includeReportLink === 'boolean' ? rawPref.includeReportLink : true;
  const includeSummary =
    typeof rawPref.includeSummary === 'boolean' ? rawPref.includeSummary : true;

  let muteUntil: string | undefined;
  if (rawPref.muteUntil && typeof rawPref.muteUntil === 'string') {
    const parsedDate = Date.parse(rawPref.muteUntil);
    if (!isNaN(parsedDate)) {
      muteUntil = new Date(parsedDate).toISOString();
    } else {
      errors.push('muteUntil must be a valid ISO 8601 date string.');
    }
  }

  // Validate channels
  const channels: WebhookChannelConfig[] = [];
  if (Array.isArray(raw.channels)) {
    for (let i = 0; i < raw.channels.length; i++) {
      const ch = raw.channels[i];
      if (!ch || typeof ch !== 'object') {
        errors.push(`Channel at index ${i} is not a valid object.`);
        continue;
      }

      const chRecord = ch as Record<string, unknown>;
      const channelId =
        typeof chRecord.id === 'string' && chRecord.id.trim()
          ? chRecord.id.trim()
          : `ch_${Date.now()}_${i}`;

      const channelType = chRecord.channelType as NotificationChannelType;
      if (!SUPPORTED_NOTIFICATION_CHANNELS.includes(channelType)) {
        errors.push(
          `Channel "${channelId}" has invalid channelType "${chRecord.channelType}". Supported: ${SUPPORTED_NOTIFICATION_CHANNELS.join(', ')}.`
        );
        continue;
      }

      const channelEnabled = typeof chRecord.enabled === 'boolean' ? chRecord.enabled : false;

      // Validate events
      const notifyOnEvents: NotificationEventType[] = [];
      if (Array.isArray(chRecord.notifyOnEvents)) {
        for (const ev of chRecord.notifyOnEvents) {
          if (SUPPORTED_NOTIFICATION_EVENTS.includes(ev as NotificationEventType)) {
            if (!notifyOnEvents.includes(ev as NotificationEventType)) {
              notifyOnEvents.push(ev as NotificationEventType);
            }
          } else {
            errors.push(`Channel "${channelId}" contains unsupported event type: "${ev}".`);
          }
        }
      } else {
        // Safe default: notify on failures and regressions
        notifyOnEvents.push('run.failed', 'regression.detected', 'security.alert');
      }

      channels.push({
        id: channelId,
        channelType,
        enabled: channelEnabled,
        webhookUrlEncrypted:
          typeof chRecord.webhookUrlEncrypted === 'string'
            ? chRecord.webhookUrlEncrypted
            : undefined,
        webhookUrlMasked:
          typeof chRecord.webhookUrlMasked === 'string' ? chRecord.webhookUrlMasked : undefined,
        hasSecret: Boolean(chRecord.hasSecret || chRecord.webhookUrlEncrypted),
        channelName:
          typeof chRecord.channelName === 'string' ? chRecord.channelName.trim() : undefined,
        notifyOnEvents,
        createdAt:
          typeof chRecord.createdAt === 'string' ? chRecord.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validatedSettings: ProjectNotificationSettings = {
    projectId,
    enabled,
    channels,
    deliveryPreferences: {
      minSeverity,
      includeReportLink,
      includeSummary,
      ...(muteUntil ? { muteUntil } : {}),
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    valid: true,
    settings: validatedSettings,
    errors: [],
  };
}

/**
 * Validates a normalized notification event payload.
 */
export function validateNotificationEvent(
  input: unknown
): { valid: boolean; event?: NotificationEventPayload; errors: string[] } {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Event payload must be an object.'] };
  }

  const raw = input as Record<string, unknown>;

  if (!raw.id || typeof raw.id !== 'string') {
    errors.push('Event ID is required.');
  }

  if (
    !raw.eventType ||
    !SUPPORTED_NOTIFICATION_EVENTS.includes(raw.eventType as NotificationEventType)
  ) {
    errors.push(`Invalid or unsupported eventType: "${raw.eventType}".`);
  }

  if (!raw.projectId || typeof raw.projectId !== 'string') {
    errors.push('projectId is required.');
  }

  if (!raw.projectName || typeof raw.projectName !== 'string') {
    errors.push('projectName is required.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const event: NotificationEventPayload = {
    id: String(raw.id),
    eventType: raw.eventType as NotificationEventType,
    projectId: String(raw.projectId),
    projectName: String(raw.projectName),
    runId: typeof raw.runId === 'string' ? raw.runId : undefined,
    runNumber: typeof raw.runNumber === 'number' ? raw.runNumber : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    branch: typeof raw.branch === 'string' ? raw.branch : undefined,
    commitHash: typeof raw.commitHash === 'string' ? raw.commitHash : undefined,
    commitMessage: typeof raw.commitMessage === 'string' ? raw.commitMessage : undefined,
    reportUrl: typeof raw.reportUrl === 'string' ? raw.reportUrl : undefined,
    summary: typeof raw.summary === 'string' ? raw.summary : `Event: ${raw.eventType}`,
    details: raw.details && typeof raw.details === 'object' ? (raw.details as Record<string, unknown>) : undefined,
    regressions: Array.isArray(raw.regressions) ? (raw.regressions as any) : undefined,
    securityAlerts: Array.isArray(raw.securityAlerts) ? (raw.securityAlerts as any) : undefined,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    isTest: Boolean(raw.isTest),
  };

  return { valid: true, event, errors: [] };
}

/**
 * Determines if a given notification event is eligible for delivery based on project settings and channel preferences.
 */
export function isEventEligibleForDelivery(
  event: NotificationEventPayload,
  channel: WebhookChannelConfig,
  settings: ProjectNotificationSettings
): { eligible: boolean; reason?: string } {
  // Test events are always eligible if channel is configured and enabled
  if (event.isTest) {
    if (!channel.hasSecret && !channel.webhookUrlEncrypted) {
      return { eligible: false, reason: 'Channel has no webhook URL configured.' };
    }
    return { eligible: true };
  }

  // Master switch check
  if (!settings.enabled) {
    return { eligible: false, reason: 'Project notifications are disabled.' };
  }

  // Channel enabled check
  if (!channel.enabled) {
    return { eligible: false, reason: `Channel "${channel.id}" is disabled.` };
  }

  // Channel secret check
  if (!channel.hasSecret && !channel.webhookUrlEncrypted) {
    return { eligible: false, reason: `Channel "${channel.id}" has no webhook secret configured.` };
  }

  // Mute check
  if (settings.deliveryPreferences.muteUntil) {
    const muteTime = new Date(settings.deliveryPreferences.muteUntil).getTime();
    if (Date.now() < muteTime) {
      return { eligible: false, reason: `Notifications are muted until ${settings.deliveryPreferences.muteUntil}.` };
    }
  }

  // Channel event subscription check
  if (!channel.notifyOnEvents.includes(event.eventType)) {
    return { eligible: false, reason: `Channel "${channel.id}" is not subscribed to "${event.eventType}".` };
  }

  // Severity filter check
  const filter = settings.deliveryPreferences.minSeverity;
  if (filter === 'failures_only') {
    const isFailure =
      event.eventType === 'run.failed' ||
      event.eventType === 'regression.detected' ||
      event.eventType === 'security.alert' ||
      event.status === 'failed';
    if (!isFailure) {
      return { eligible: false, reason: 'Filter "failures_only" excludes non-failure event.' };
    }
  } else if (filter === 'regressions_only') {
    const isRegression =
      event.eventType === 'regression.detected' ||
      (event.regressions && event.regressions.length > 0);
    if (!isRegression) {
      return { eligible: false, reason: 'Filter "regressions_only" excludes non-regression event.' };
    }
  }

  return { eligible: true };
}
