/**
 * GitHub Webhook Event Parser & Normalizer (Contribution 193)
 * Normalizes raw GitHub webhook payloads (pull_request, push, check_run)
 * into standard PROOFix NormalizedGitEvent structures for automated test runs.
 */

import type { NormalizedGitEvent, GitEventType } from '../types/git-integrations.ts';

export interface GitHubWebhookHeaders {
  'x-github-event'?: string;
  'x-github-delivery'?: string;
  'x-hub-signature-256'?: string;
  [key: string]: string | undefined;
}

export function extractBranchFromRef(ref?: string): string {
  if (!ref) return 'main';
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
}

export function isSupportedGitHubEvent(eventName?: string): boolean {
  if (!eventName) return false;
  return ['pull_request', 'push', 'check_run', 'check_suite', 'ping'].includes(eventName.toLowerCase());
}

export function parseGitHubWebhook(
  headers: Record<string, string | undefined>,
  payload: any
): NormalizedGitEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // Find github event header in case-insensitive way
  const eventHeader = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'x-github-event'
  );
  const rawEvent = (eventHeader ? headers[eventHeader] : '') || '';
  const deliveryHeader = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'x-github-delivery'
  );
  const deliveryId = (deliveryHeader ? headers[deliveryHeader] : '') || `gh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const repo = payload.repository || {};
  const owner = repo.owner?.login || repo.owner?.name || 'unknown';
  const repoName = repo.name || 'unknown-repo';
  const fullName = repo.full_name || `${owner}/${repoName}`;
  const cloneUrl = repo.clone_url || `https://github.com/${fullName}.git`;
  const defaultBranch = repo.default_branch || 'main';

  const sender = {
    username: payload.sender?.login || 'ghost',
    avatarUrl: payload.sender?.avatar_url || undefined,
  };

  const timestamp = new Date().toISOString();

  // 1. Pull Request Event
  if (rawEvent === 'pull_request') {
    const action = payload.action;
    let eventType: GitEventType;

    if (action === 'opened') {
      eventType = 'pull_request_opened';
    } else if (action === 'synchronize') {
      eventType = 'pull_request_synchronize';
    } else if (action === 'reopened') {
      eventType = 'pull_request_opened';
    } else {
      // Ignore other actions like labeled, closed, etc.
      return null;
    }

    const pr = payload.pull_request || {};
    const headSha = pr.head?.sha || payload.after || '0000000000000000000000000000000000000000';
    const branch = pr.head?.ref || extractBranchFromRef(pr.head?.ref);

    return {
      id: deliveryId,
      provider: 'github',
      eventType,
      repository: {
        owner,
        name: repoName,
        fullName,
        cloneUrl,
        defaultBranch,
      },
      sender,
      commitSha: headSha,
      branch,
      pullRequestNumber: pr.number,
      pullRequestTitle: pr.title || 'Untitled Pull Request',
      pullRequestUrl: pr.html_url || `https://github.com/${fullName}/pull/${pr.number}`,
      timestamp,
    };
  }

  // 2. Push Event
  if (rawEvent === 'push') {
    // If deleted ref or empty commits, return null
    if (payload.deleted === true || payload.after === '0000000000000000000000000000000000000000') {
      return null;
    }

    const commitSha = payload.after || payload.head_commit?.id || '0000000000000000000000000000000000000000';
    const branch = extractBranchFromRef(payload.ref);

    return {
      id: deliveryId,
      provider: 'github',
      eventType: 'push',
      repository: {
        owner,
        name: repoName,
        fullName,
        cloneUrl,
        defaultBranch,
      },
      sender,
      commitSha,
      branch,
      timestamp,
    };
  }

  // 3. Check Run Rerequested
  if (rawEvent === 'check_run' && payload.action === 'rerequested') {
    const checkRun = payload.check_run || {};
    const commitSha = checkRun.head_sha || '0000000000000000000000000000000000000000';
    const branch = checkRun.check_suite?.head_branch || defaultBranch;

    return {
      id: deliveryId,
      provider: 'github',
      eventType: 'check_run_rerequested',
      repository: {
        owner,
        name: repoName,
        fullName,
        cloneUrl,
        defaultBranch,
      },
      sender,
      commitSha,
      branch,
      timestamp,
    };
  }

  return null;
}
