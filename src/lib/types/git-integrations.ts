/**
 * Native Git Integrations & Webhook Ingestion Types (Contribution 191)
 */

export type GitProvider = 'github' | 'gitlab';

export type GitEventType =
  | 'pull_request_opened'
  | 'pull_request_synchronize'
  | 'push'
  | 'check_run_rerequested'
  | 'merge_request_opened';

export interface NormalizedGitEvent {
  id: string;
  provider: GitProvider;
  eventType: GitEventType;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    cloneUrl: string;
    defaultBranch: string;
  };
  sender: {
    username: string;
    avatarUrl?: string;
  };
  commitSha: string;
  branch: string;
  pullRequestNumber?: number;
  pullRequestTitle?: string;
  pullRequestUrl?: string;
  timestamp: string;
}

export type CheckRunStatus = 'queued' | 'in_progress' | 'completed';
export type CheckRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'timed_out'
  | 'action_required';

export interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
  annotationsCount?: number;
  images?: Array<{ alt: string; imageUrl: string; caption?: string }>;
}

export interface CheckRunPayload {
  name: string;
  headSha: string;
  status: CheckRunStatus;
  conclusion?: CheckRunConclusion;
  startedAt: string;
  completedAt?: string;
  detailsUrl?: string;
  externalId?: string;
  output: CheckRunOutput;
}

export interface PrReviewComment {
  pullRequestNumber: number;
  commitSha: string;
  body: string;
  patchDiff?: string;
  selfHealingPrUrl?: string;
  verificationPassed: boolean;
}

export interface WebhookVerificationResult {
  valid: boolean;
  provider: GitProvider;
  error?: string;
}

export interface GitIntegrationConfig {
  provider: GitProvider;
  webhookSecret: string;
  appId?: string;
  privateKey?: string;
  enabledEvents: GitEventType[];
  autoTriggerVerification: boolean;
  autoCommentHealingPr: boolean;
}
