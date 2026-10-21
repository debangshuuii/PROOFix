import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { globalWebhookVerifier } from '../src/lib/integrations/webhook-verifier.ts';
import { parseGitHubWebhook } from '../src/lib/integrations/github-parser.ts';
import { parseGitLabWebhook } from '../src/lib/integrations/gitlab-parser.ts';

test('GitHub webhook verification and parsing pipeline works end-to-end', () => {
  const secret = 'safe_mock_test_secret_for_webhook_verification';
  const payload = {
    action: 'opened',
    pull_request: {
      number: 88,
      title: 'feat: add zero-day chaos crawler',
      head: { sha: '1234567890abcdef1234567890abcdef12345678', ref: 'feature/chaos' },
    },
    repository: {
      name: 'proofix',
      full_name: 'acme/proofix',
      clone_url: 'https://github.com/acme/proofix.git',
      default_branch: 'main',
      owner: { login: 'acme' },
    },
    sender: { login: 'eve-tester' },
  };

  const rawBody = JSON.stringify(payload);
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(Buffer.from(rawBody, 'utf8')).digest('hex')}`;

  // 1. Signature check
  const verification = globalWebhookVerifier.verifyGitHubSignature(rawBody, signature, secret);
  assert.equal(verification.valid, true);

  // 2. Parser check
  const headers = {
    'x-github-event': 'pull_request',
    'x-github-delivery': 'delivery-88-abc',
  };
  const event = parseGitHubWebhook(headers, payload);
  assert.ok(event);
  assert.equal(event.pullRequestNumber, 88);
  assert.equal(event.commitSha, '1234567890abcdef1234567890abcdef12345678');
  assert.equal(event.branch, 'feature/chaos');
});

test('GitLab webhook verification and parsing pipeline works end-to-end', () => {
  const secret = 'safe_mock_gitlab_token_secret_123';
  const payload = {
    object_kind: 'merge_request',
    project: {
      name: 'proofix-runner',
      path_with_namespace: 'group/proofix-runner',
      git_http_url: 'https://gitlab.com/group/proofix-runner.git',
      default_branch: 'main',
    },
    user: { username: 'gitlab-tester' },
    object_attributes: {
      id: 500,
      iid: 45,
      title: 'refactor: database adapters',
      source_branch: 'refactor/db',
      action: 'open',
      last_commit: { id: '99887766554433221100aabbccddeeff99887766' },
    },
  };

  const tokenVerification = globalWebhookVerifier.verifyGitLabToken(secret, secret);
  assert.equal(tokenVerification.valid, true);

  const event = parseGitLabWebhook({ 'x-gitlab-event': 'Merge Request Hook' }, payload);
  assert.ok(event);
  assert.equal(event.provider, 'gitlab');
  assert.equal(event.pullRequestNumber, 45);
  assert.equal(event.commitSha, '99887766554433221100aabbccddeeff99887766');
});
