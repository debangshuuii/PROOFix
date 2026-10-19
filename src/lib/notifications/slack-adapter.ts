import type { NotificationEventPayload } from '../types/notification.ts';
import { sanitizeWebhookLogs } from './secret-vault.ts';

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: {
    type: string;
    text: string;
  }[];
  elements?: unknown[];
}

export interface SlackPayload {
  text: string; // Fallback notification text
  blocks: SlackBlock[];
}

export interface SlackAdapterOptions {
  includeReportLink?: boolean;
  includeSummary?: boolean;
  baseUrl?: string;
}

/**
 * Maps event types and run status to appropriate visual indicator emoji and title.
 */
function getEventVisuals(event: NotificationEventPayload): { emoji: string; statusText: string } {
  if (event.isTest) {
    return { emoji: '🧪', statusText: 'Test Notification' };
  }

  switch (event.eventType) {
    case 'run.completed':
      return { emoji: '✅', statusText: 'Verification Passed' };
    case 'run.failed':
      return { emoji: '❌', statusText: 'Verification Failed' };
    case 'regression.detected':
      return { emoji: '⚠️', statusText: 'Regression Detected' };
    case 'security.alert':
      return { emoji: '🚨', statusText: 'Security Alert' };
    case 'run.started':
      return { emoji: '🔄', statusText: 'Verification Started' };
    default:
      return { emoji: 'ℹ️', statusText: event.eventType };
  }
}

/**
 * Builds a Slack-compatible Block Kit message payload from a normalized NotificationEventPayload.
 * "Done when: payloads pass adapter tests and contain no raw source code or secrets."
 */
export function formatSlackMessage(
  event: NotificationEventPayload,
  options: SlackAdapterOptions = {}
): SlackPayload {
  const { emoji, statusText } = getEventVisuals(event);
  const includeReportLink = options.includeReportLink !== false;
  const includeSummary = options.includeSummary !== false;

  const shortCommit = event.commitHash ? event.commitHash.slice(0, 7) : 'HEAD';
  const branchInfo = event.branch ? `${event.branch} (${shortCommit})` : shortCommit;

  const cleanSummary = sanitizeWebhookLogs(
    (event.summary || '').replace(/```[\s\S]*?```/g, '[Code Snippet Omitted]')
  );

  // Header fallback text
  const fallbackText = `${emoji} [${event.projectName}] ${statusText}: ${cleanSummary}`;

  const blocks: SlackBlock[] = [];

  // Block 1: Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${emoji} PROOFix: ${statusText}`,
      emoji: true,
    },
  });

  // Block 2: Key Fields (Project, Status, Branch/Commit, Run ID)
  const fields: { type: string; text: string }[] = [
    {
      type: 'mrkdwn',
      text: `*Project:*\n${event.projectName}`,
    },
    {
      type: 'mrkdwn',
      text: `*Status:*\n${statusText}`,
    },
    {
      type: 'mrkdwn',
      text: `*Branch/Commit:*\n\`${branchInfo}\``,
    },
  ];

  if (event.runNumber !== undefined || event.runId) {
    fields.push({
      type: 'mrkdwn',
      text: `*Run:*\n#${event.runNumber || event.runId}`,
    });
  }

  blocks.push({
    type: 'section',
    fields,
  });

  // Block 3: Summary text (sanitized of code and secrets)
  if (includeSummary && event.summary) {
    const cleanSummary = sanitizeWebhookLogs(event.summary.replace(/```[\s\S]*?```/g, '[Code Snippet Omitted]'));
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${cleanSummary}`,
      },
    });
  }

  // Block 4: Regressions list (if any)
  if (event.regressions && event.regressions.length > 0) {
    const regList = event.regressions
      .slice(0, 5)
      .map((r) => `• *[${r.severity.toUpperCase()}]* ${r.title}${r.route ? ` (\`${r.route}\`)` : ''}`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Regressions (${event.regressions.length}):*\n${regList}`,
      },
    });
  }

  // Block 5: Security Alerts (if any) - Strictly metadata only, NEVER credential values
  // "Security rule for this feature: finding a credential does not authorize PROOFix to use it.
  // The application should report it safely, not attempt authentication with it"
  if (event.securityAlerts && event.securityAlerts.length > 0) {
    const secList = event.securityAlerts
      .map((s) => `• *${s.type === 'secret' ? 'Credential Finding' : 'Vulnerability'}*: ${s.count} detected (Highest: *${s.maxSeverity.toUpperCase()}*)`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Security Preflight Findings:*\n${secList}`,
      },
    });
  }

  // Block 6: Report Link where available
  const reportUrl = event.reportUrl || (event.runId && options.baseUrl ? `${options.baseUrl}/projects/${event.projectId}/runs/${event.runId}` : undefined);
  if (includeReportLink && reportUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👉 *<${reportUrl}|View Detailed Verification Report>*`,
      },
    });
  }

  // Block 7: Context Footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `PROOFix Preflight Engine • <!date^${Math.floor(new Date(event.timestamp).getTime() / 1000)}^{date_num} {time_secs}|${event.timestamp}>`,
      },
    ],
  });

  return {
    text: sanitizeWebhookLogs(fallbackText),
    blocks,
  };
}
