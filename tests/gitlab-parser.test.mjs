import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitLabWebhook,
  extractGitLabBranch,
  isSupportedGitLabEvent,
} from '../src/lib/integrations/gitlab-parser.ts';

test('extractGitLabBranch parses refs cleanly', () => {
  assert.equal(extractGitLabBranch('refs/heads/release/2.0'), 'release/2.0');
  assert.equal(extractGitLabBranch('refs/tags/v1.2.3'), 'v1.2.3');
  assert.equal(extractGitLabBranch(undefined), 'main');
});

test('isSupportedGitLabEvent recognizes Merge Request and Push hooks', () => {
  assert.equal(isSupportedGitLabEvent('Merge Request Hook'), true);
  assert.equal(isSupportedGitLabEvent('Push Hook'), true);
  assert.equal(isSupportedGitLabEvent(undefined, 'merge_request'), true);
  assert.equal(isSupportedGitLabEvent('Issue Hook'), false);
});

test('parseGitLabWebhook parses merge_request open payload', () => {
  const headers = {
    'x-gitlab-event': 'Merge Request Hook',
    'x-gitlab-event-uuid': 'gitlab-mr-uuid-999',
  };
  const payload = {
    object_kind: 'merge_request',
    user: {
      username: 'carol-qa',
      avatar_url: 'https://gitlab.com/uploads/-/system/user/avatar/carol.png',
    },
    project: {
      name: 'proofix-runner',
      path_with_namespace: 'fintech-corp/proofix-runner',
      git_http_url: 'https://gitlab.com/fintech-corp/proofix-runner.git',
      default_branch: 'main',
    },
    object_attributes: {
      id: 101,
      iid: 12,
      title: 'feat: add SOC2 compliance ledger',
      source_branch: 'feature/soc2',
      action: 'open',
      url: 'https://gitlab.com/fintech-corp/proofix-runner/-/merge_requests/12',
      last_commit: {
        id: '99887766554433221100aabbccddeeff00112233',
      },
    },
  };

  const event = parseGitLabWebhook(headers, payload);
  assert.ok(event);
  assert.equal(event.provider, 'gitlab');
  assert.equal(event.eventType, 'merge_request_opened');
  assert.equal(event.id, 'gitlab-mr-uuid-999');
  assert.equal(event.commitSha, '99887766554433221100aabbccddeeff00112233');
  assert.equal(event.branch, 'feature/soc2');
  assert.equal(event.pullRequestNumber, 12);
  assert.equal(event.pullRequestTitle, 'feat: add SOC2 compliance ledger');
  assert.equal(event.repository.fullName, 'fintech-corp/proofix-runner');
});

test('parseGitLabWebhook parses push hook payload', () => {
  const headers = {
    'x-gitlab-event': 'Push Hook',
  };
  const payload = {
    object_kind: 'push',
    ref: 'refs/heads/develop',
    after: '11223344556677889900aabbccddeeff11223344',
    user_username: 'dave-devops',
    project: {
      name: 'proofix-runner',
      path_with_namespace: 'fintech-corp/proofix-runner',
      git_http_url: 'https://gitlab.com/fintech-corp/proofix-runner.git',
      default_branch: 'main',
    },
  };

  const event = parseGitLabWebhook(headers, payload);
  assert.ok(event);
  assert.equal(event.provider, 'gitlab');
  assert.equal(event.eventType, 'push');
  assert.equal(event.branch, 'develop');
  assert.equal(event.commitSha, '11223344556677889900aabbccddeeff11223344');
});
