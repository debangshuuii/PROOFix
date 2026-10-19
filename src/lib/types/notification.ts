/**
 * PROOFix - Slack & Discord Webhook Notification Types (Feature 9)
 */

export type NotificationEventType =
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'regression.detected'
  | 'security.alert';

export type NotificationChannelType = 'slack' | 'discord';

export type DeliverySeverityFilter = 'all' | 'failures_only' | 'regressions_only';

export interface WebhookChannelConfig {
  id: string;
  channelType: NotificationChannelType;
  enabled: boolean;
  webhookUrlEncrypted?: string;
  webhookUrlMasked?: string;
  hasSecret: boolean;
  channelName?: string;
  notifyOnEvents: NotificationEventType[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPreferences {
  minSeverity: DeliverySeverityFilter;
  includeReportLink: boolean;
  includeSummary: boolean;
  muteUntil?: string;
}

export interface ProjectNotificationSettings {
  projectId: string;
  /** Master switch - default false so defaults NEVER send unsolicited notifications */
  enabled: boolean;
  channels: WebhookChannelConfig[];
  deliveryPreferences: DeliveryPreferences;
  updatedAt: string;
}

export interface NotificationEventPayload {
  id: string;
  eventType: NotificationEventType;
  projectId: string;
  projectName: string;
  runId?: string;
  runNumber?: number;
  status?: string;
  branch?: string;
  commitHash?: string;
  commitMessage?: string;
  reportUrl?: string;
  summary: string;
  details?: Record<string, unknown>;
  regressions?: {
    title: string;
    route?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  securityAlerts?: {
    type: 'vulnerability' | 'secret';
    count: number;
    maxSeverity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  timestamp: string;
  isTest?: boolean;
}
