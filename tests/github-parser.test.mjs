import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubWebhook,
  extractBranchFromRef,
  isSupportedGitHubEvent,
} from '../src/lib/integrations/github-parser.ts';

test('extractBranchFromRef parses branch names accurately', () => {
  assert.equal(extractBranchFromRef('refs/heads/feature/auth'), 'feature/auth');
  assert.equal(extractBranchFromRef('refs/heads/main'), 'main');
  assert.equal(extractBranchFromRef('refs/tags/v1.0.0'), 'v1.0.0');
  assert.equal(extractBranchFromRef(undefined), 'main');
});

test('isSupportedGitHubEvent correctly identifies valid events', () => {
  assert.equal(isSupportedGitHubEvent('pull_request'), true);
  assert.equal(isSupportedGitHubEvent('push'), true);
  assert.equal(isSupportedGitHubEvent('check_run'), true);
  assert.equal(isSupportedGitHubEvent('star'), false);
  assert.equal(isSupportedGitHubEvent(''), false);
});

test('parseGitHubWebhook parses pull_request opened event', () => {
  const headers = {
    'x-github-event': 'pull_request',
    'x-github-delivery': 'delivery-uuid-1234',
  };
  const payload = {
    action: 'opened',
    pull_request: {
      number: 42,
      title: 'feat: add distributed tracing',
      html_url: 'https://github.com/acme/proofix/pull/42',
      head: {
        sha: 'a1b2c3d4e5f67890123456789abcdef012345678',
        ref: 'feature/tracing',
      },
    },
    repository: {
      owner: { login: 'acme' },
      name: 'proofix',
      full_name: 'acme/proofix',
      clone_url: 'https://github.com/acme/proofix.git',
      default_branch: 'main',
    },
    sender: {
      login: 'alice-dev',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    },
  };

  const event = parseGitHubWebhook(headers, payload);
  assert.ok(event);
  assert.equal(event.provider, 'github');
  assert.equal(event.eventType, 'pull_request_opened');
  assert.equal(event.id, 'delivery-uuid-1234');
  assert.equal(event.commitSha, 'a1b2c3d4e5f67890123456789abcdef012345678');
  assert.equal(event.branch, 'feature/tracing');
  assert.equal(event.pullRequestNumber, 42);
  assert.equal(event.pullRequestTitle, 'feat: add distributed tracing');
  assert.equal(event.repository.fullName, 'acme/proofix');
});

test('parseGitHubWebhook parses push event', () => {
  const headers = {
    'x-github-event': 'push',
    'x-github-delivery': 'delivery-uuid-5678',
  };
  const payload = {
    ref: 'refs/heads/main',
    after: 'feedbeefcafe1234567890abcdef1234567890ab',
    repository: {
      owner: { login: 'acme' },
      name: 'proofix',
      full_name: 'acme/proofix',
      clone_url: 'https://github.com/acme/proofix.git',
      default_branch: 'main',
    },
    sender: {
      login: 'bob-ci',
    },
  };

  const event = parseGitHubWebhook(headers, payload);
  assert.ok(event);
  assert.equal(event.provider, 'github');
  assert.equal(event.eventType, 'push');
  assert.equal(event.branch, 'main');
  assert.equal(event.commitSha, 'feedbeefcafe1234567890abcdef1234567890ab');
});

test('parseGitHubWebhook ignores unsupported actions or empty payloads', () => {
  assert.equal(parseGitHubWebhook({}, null), null);
  assert.equal(parseGitHubWebhook({ 'x-github-event': 'pull_request' }, { action: 'labeled' }), null);
  assert.equal(parseGitHubWebhook({ 'x-github-event': 'push' }, { deleted: true }), null);
});
