import type { NotificationEventPayload } from '../types/notification.ts';
import { sanitizeWebhookLogs } from './secret-vault.ts';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordAdapterOptions {
  includeReportLink?: boolean;
  includeSummary?: boolean;
  baseUrl?: string;
}

export interface DiscordResponseResult {
  ok: boolean;
  statusCode: number;
  shouldRetry: boolean;
  retryAfterMs?: number;
  error?: string;
}

/**
 * Returns Discord color integer and visual indicator based on event type.
 */
function getDiscordVisuals(event: NotificationEventPayload): { color: number; title: string } {
  if (event.isTest) {
    return { color: 0x64748b, title: '🧪 PROOFix Webhook Test Notification' }; // Slate
  }

  switch (event.eventType) {
    case 'run.completed':
      return { color: 0x22c55e, title: '✅ PROOFix: Verification Run Succeeded' }; // Emerald
    case 'run.failed':
      return { color: 0xef4444, title: '❌ PROOFix: Verification Run Failed' }; // Red
    case 'regression.detected':
      return { color: 0xf59e0b, title: '⚠️ PROOFix: Behavioral Regression Detected' }; // Amber
    case 'security.alert':
      return { color: 0x8b5cf6, title: '🚨 PROOFix: Security Preflight Alert' }; // Purple
    case 'run.started':
      return { color: 0x3b82f6, title: '🔄 PROOFix: Verification Run Started' }; // Blue
    default:
      return { color: 0x64748b, title: `ℹ️ PROOFix: ${event.eventType}` };
  }
}

/**
 * Clamps a string to a maximum character length safely.
 */
function clampString(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

/**
 * Formats a normalized NotificationEventPayload into a Discord-compatible webhook message.
 * Enforces Discord limits:
 * - Content max 2000 chars
 * - Embed title max 256 chars
 * - Embed description max 4096 chars (clamped to 1000 for conciseness)
 * - Embed field name max 256 chars, field value max 1024 chars
 * - Max 25 fields per embed
 * "Done when: mocked Discord requests validate the message structure and handle API errors correctly."
 */
export function formatDiscordMessage(
  event: NotificationEventPayload,
  options: DiscordAdapterOptions = {}
): DiscordPayload {
  const { color, title } = getDiscordVisuals(event);
  const includeReportLink = options.includeReportLink !== false;
  const includeSummary = options.includeSummary !== false;

  const shortCommit = event.commitHash ? event.commitHash.slice(0, 7) : 'HEAD';
  const branchInfo = event.branch ? `${event.branch} (${shortCommit})` : shortCommit;

  const reportUrl =
    event.reportUrl ||
    (event.runId && options.baseUrl
      ? `${options.baseUrl}/projects/${event.projectId}/runs/${event.runId}`
      : undefined);

  // Fallback / notification ping content (capped to 2000 chars)
  const content = clampString(
    sanitizeWebhookLogs(
      `${title} for **${event.projectName}**${event.summary ? `: ${event.summary.replace(/```[\s\S]*?```/g, '[Code Snippet Omitted]')}` : ''}`
    ),
    1950
  );

  const embed: DiscordEmbed = {
    title: clampString(title, 250),
    color,
    timestamp: event.timestamp || new Date().toISOString(),
    fields: [],
    footer: {
      text: 'PROOFix Preflight Engine • Verification & Security Guard',
    },
  };

  if (includeReportLink && reportUrl) {
    embed.url = reportUrl;
  }

  // Summary description
  if (includeSummary && event.summary) {
    const cleanSummary = sanitizeWebhookLogs(
      event.summary.replace(/```[\s\S]*?```/g, '[Code Snippet Omitted]')
    );
    embed.description = clampString(cleanSummary, 1000);
  }

  // Fields: Project, Status, Commit
  embed.fields?.push(
    {
      name: 'Project',
      value: clampString(event.projectName, 250),
      inline: true,
    },
    {
      name: 'Status',
      value: clampString(event.status || event.eventType, 250),
      inline: true,
    },
    {
      name: 'Branch / Commit',
      value: clampString(`\`${branchInfo}\``, 250),
      inline: true,
    }
  );

  if (event.runNumber !== undefined || event.runId) {
    embed.fields?.push({
      name: 'Run Number',
      value: `#${event.runNumber || event.runId}`,
      inline: true,
    });
  }

  // Regressions field (if any)
  if (event.regressions && event.regressions.length > 0) {
    const regList = event.regressions
      .slice(0, 4)
      .map((r) => `• [${r.severity.toUpperCase()}] ${r.title}${r.route ? ` (\`${r.route}\`)` : ''}`)
      .join('\n');

    embed.fields?.push({
      name: `Regressions Detected (${event.regressions.length})`,
      value: clampString(regList, 1000),
      inline: false,
    });
  }

  // Security Alerts field - strictly metadata, NEVER raw credentials
  // "finding a credential does not authorize PROOFix to use it. The application should report it safely"
  if (event.securityAlerts && event.securityAlerts.length > 0) {
    const secList = event.securityAlerts
      .map(
        (s) =>
          `• ${s.type === 'secret' ? 'Credential Found' : 'Vulnerability'}: ${s.count} (${s.maxSeverity.toUpperCase()})`
      )
      .join('\n');

    embed.fields?.push({
      name: 'Security Preflight Findings',
      value: clampString(secList, 1000),
      inline: false,
    });
  }

  if (includeReportLink && reportUrl) {
    embed.fields?.push({
      name: 'Report',
      value: `[View Full Verification Report](${reportUrl})`,
      inline: false,
    });
  }

  return {
    content,
    embeds: [embed],
  };
}

/**
 * Handles responses and error statuses returned by the Discord Webhook API.
 * "Done when: mocked Discord requests validate the message structure and handle API errors correctly."
 */
export function handleDiscordApiResponse(
  statusCode: number,
  responseBody?: unknown
): DiscordResponseResult {
  if (statusCode === 200 || statusCode === 204) {
    return {
      ok: true,
      statusCode,
      shouldRetry: false,
    };
  }

  // Rate Limiting (HTTP 429)
  if (statusCode === 429) {
    let retryAfterMs = 5000; // Default 5s
    if (responseBody && typeof responseBody === 'object') {
      const body = responseBody as Record<string, unknown>;
      if (typeof body.retry_after === 'number') {
        retryAfterMs = Math.ceil(body.retry_after * 1000);
      }
    }
    return {
      ok: false,
      statusCode,
      shouldRetry: true,
      retryAfterMs,
      error: `Discord rate limit exceeded (429). Retry after ${retryAfterMs}ms.`,
    };
  }

  // Bad Request / Invalid Webhook Payload (HTTP 400)
  if (statusCode === 400) {
    const errorDetails =
      responseBody && typeof responseBody === 'object'
        ? JSON.stringify(responseBody)
        : 'Bad Request';
    return {
      ok: false,
      statusCode,
      shouldRetry: false,
      error: `Discord rejected webhook payload (400 Bad Request): ${errorDetails}`,
    };
  }

  // Webhook not found or deleted (HTTP 404)
  if (statusCode === 404) {
    return {
      ok: false,
      statusCode,
      shouldRetry: false,
      error: 'Discord webhook URL is invalid or has been deleted (404 Not Found).',
    };
  }

  // Transient Server Errors (HTTP 500, 502, 503, 504)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      ok: false,
      statusCode,
      shouldRetry: true,
      retryAfterMs: 3000,
      error: `Discord server error (${statusCode}). Request should be retried.`,
    };
  }

  // Other client errors (401, 403, etc.)
  return {
    ok: false,
    statusCode,
    shouldRetry: false,
    error: `Discord webhook request failed with HTTP ${statusCode}.`,
  };
}
