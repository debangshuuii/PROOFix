/**
 * GitLab Webhook Event Parser & Normalizer (Contribution 194)
 * Normalizes raw GitLab webhook payloads (Merge Request Hook, Push Hook)
 * into standard PROOFix NormalizedGitEvent structures for automated verification.
 */

import type { NormalizedGitEvent, GitEventType } from '../types/git-integrations.ts';

export function extractGitLabBranch(ref?: string): string {
  if (!ref) return 'main';
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
}

export function isSupportedGitLabEvent(eventHeader?: string, objectKind?: string): boolean {
  const normHeader = (eventHeader || '').toLowerCase();
  const normKind = (objectKind || '').toLowerCase();

  return (
    normHeader.includes('merge request') ||
    normHeader.includes('push hook') ||
    normKind === 'merge_request' ||
    normKind === 'push'
  );
}

export function parseGitLabWebhook(
  headers: Record<string, string | undefined>,
  payload: any
): NormalizedGitEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const eventHeader = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'x-gitlab-event'
  );
  const rawEvent = (eventHeader ? headers[eventHeader] : '') || '';
  const uuidHeader = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'x-gitlab-event-uuid'
  );
  const deliveryId = (uuidHeader ? headers[uuidHeader] : '') || `gl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const objectKind = payload.object_kind || (rawEvent.toLowerCase().includes('merge') ? 'merge_request' : 'push');

  const project = payload.project || {};
  const fullName = project.path_with_namespace || project.name || 'unknown/gitlab-repo';
  const parts = fullName.split('/');
  const owner = parts.length > 1 ? parts[0] : 'unknown';
  const repoName = parts.length > 1 ? parts.slice(1).join('/') : fullName;
  const cloneUrl = project.git_http_url || project.web_url || `https://gitlab.com/${fullName}.git`;
  const defaultBranch = project.default_branch || 'main';

  const user = payload.user || {};
  const sender = {
    username: user.username || payload.user_username || 'gitlab-user',
    avatarUrl: user.avatar_url || undefined,
  };

  const timestamp = new Date().toISOString();

  // 1. Merge Request Hook
  if (objectKind === 'merge_request') {
    const attrs = payload.object_attributes || {};
    const action = attrs.action;

    let eventType: GitEventType;
    if (action === 'open' || action === 'reopen') {
      eventType = 'merge_request_opened';
    } else if (action === 'update') {
      eventType = 'pull_request_synchronize';
    } else if (!action && attrs.state === 'opened') {
      eventType = 'merge_request_opened';
    } else {
      return null;
    }

    const lastCommit = attrs.last_commit || {};
    const commitSha = lastCommit.id || '0000000000000000000000000000000000000000';
    const branch = attrs.source_branch || defaultBranch;

    return {
      id: deliveryId,
      provider: 'gitlab',
      eventType,
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
      pullRequestNumber: attrs.iid || attrs.id,
      pullRequestTitle: attrs.title || 'Untitled Merge Request',
      pullRequestUrl: attrs.url || `${project.web_url}/-/merge_requests/${attrs.iid}`,
      timestamp,
    };
  }

  // 2. Push Hook
  if (objectKind === 'push') {
    const after = payload.after;
    if (!after || after === '0000000000000000000000000000000000000000') {
      return null;
    }

    const branch = extractGitLabBranch(payload.ref);

    return {
      id: deliveryId,
      provider: 'gitlab',
      eventType: 'push',
      repository: {
        owner,
        name: repoName,
        fullName,
        cloneUrl,
        defaultBranch,
      },
      sender,
      commitSha: after,
      branch,
      timestamp,
    };
  }

  return null;
}
