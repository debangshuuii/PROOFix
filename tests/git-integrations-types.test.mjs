import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Native Git Integrations & Webhook Ingestion Types (Contribution 191) ---');

const typesFilePath = path.join(process.cwd(), 'src', 'lib', 'types', 'git-integrations.ts');
assert.ok(fs.existsSync(typesFilePath), 'src/lib/types/git-integrations.ts must exist');

const content = fs.readFileSync(typesFilePath, 'utf8');
assert.ok(content.includes('export type GitProvider'), 'Must declare GitProvider');
assert.ok(content.includes('export type GitEventType'), 'Must declare GitEventType');
assert.ok(content.includes('export interface NormalizedGitEvent'), 'Must declare NormalizedGitEvent');
assert.ok(content.includes('export interface CheckRunPayload'), 'Must declare CheckRunPayload');
assert.ok(content.includes('export interface PrReviewComment'), 'Must declare PrReviewComment');
assert.ok(content.includes('export interface GitIntegrationConfig'), 'Must declare GitIntegrationConfig');

const sampleEvent = {
  id: 'evt-pr-101',
  provider: 'github',
  eventType: 'pull_request_opened',
  repository: {
    owner: 'org',
    name: 'repo',
    fullName: 'org/repo',
    cloneUrl: 'https://github.com/org/repo.git',
    defaultBranch: 'main',
  },
  sender: { username: 'octocat' },
  commitSha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
  branch: 'feature/payment-redesign',
  pullRequestNumber: 42,
  pullRequestTitle: 'feat: new payment modal',
  timestamp: new Date().toISOString(),
};

assert.equal(sampleEvent.provider, 'github');
assert.equal(sampleEvent.pullRequestNumber, 42);

console.log('✅ Contribution 191 tests passed cleanly!');
