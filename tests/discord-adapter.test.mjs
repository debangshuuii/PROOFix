import assert from 'node:assert/strict';
import {
  formatDiscordMessage,
  handleDiscordApiResponse,
} from '../src/lib/notifications/discord-adapter.ts';
import { assertZeroSecretLeakage } from '../src/lib/notifications/secret-vault.ts';

console.log('--- Testing Discord Notification Adapter (Contribution 85) ---');

const syntheticSecrets = [
  'AKIAIOSFODNN7EXAMPLE',
  'ghp_abcdef1234567890abcdef1234567890abcd',
  'postgres://admin:TopSecretPassword123!@db.internal:5432/app',
];

function testDiscordFormatting() {
  const event = {
    id: 'ev_discord_01',
    eventType: 'regression.detected',
    projectId: 'proj_marketing',
    projectName: 'Marketing Site',
    runId: 'run_555',
    runNumber: 18,
    status: 'failed',
    branch: 'main',
    commitHash: '8b7a6c5d4e3f',
    reportUrl: 'https://proofix.dev/projects/proj_marketing/runs/run_555',
    summary: 'Visual regression detected on landing hero banner layout.',
    regressions: [
      {
        title: 'Hero banner layout shift',
        route: '/',
        severity: 'high',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const payload = formatDiscordMessage(event);

  // 1. Validate Discord payload structure
  assert.ok(typeof payload.content === 'string' && payload.content.length > 0);
  assert.ok(Array.isArray(payload.embeds) && payload.embeds.length === 1);

  const embed = payload.embeds[0];
  assert.ok(embed.title.includes('Regression Detected'));
  assert.equal(embed.color, 0xf59e0b, 'Amber color for regressions');
  assert.equal(embed.url, 'https://proofix.dev/projects/proj_marketing/runs/run_555');
  assert.ok(Array.isArray(embed.fields) && embed.fields.length >= 3);

  const projectField = embed.fields.find((f) => f.name === 'Project');
  assert.ok(projectField && projectField.value === 'Marketing Site');

  const commitField = embed.fields.find((f) => f.name.includes('Commit'));
  assert.ok(commitField && commitField.value.includes('8b7a6c5'));

  const regField = embed.fields.find((f) => f.name.includes('Regressions'));
  assert.ok(regField && regField.value.includes('Hero banner layout shift'));

  console.log('[PASS] Discord message embeds format project identity, status, commit, and report link.');
}

function testPayloadLimitsAndZeroExposure() {
  // Giant string and sensitive secrets test
  const giantSummary = 'A'.repeat(5000);
  const event = {
    id: 'ev_limit_01',
    eventType: 'security.alert',
    projectId: 'proj_limits',
    projectName: 'Limits Test Project',
    summary: `Found credential ${syntheticSecrets[0]} and token ${syntheticSecrets[1]}: ${giantSummary}`,
    securityAlerts: [
      {
        type: 'secret',
        count: 2,
        maxSeverity: 'critical',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const payload = formatDiscordMessage(event);

  // Assert Discord limits are strictly respected
  assert.ok(payload.content.length <= 2000, 'Content must not exceed 2000 chars');
  const embed = payload.embeds[0];
  assert.ok(embed.description.length <= 1024, 'Description clamped safely');
  assert.ok(embed.title.length <= 256, 'Title clamped safely');

  // Assert zero secret leakage
  const serialized = JSON.stringify(payload);
  for (const secret of syntheticSecrets) {
    assert.equal(serialized.includes(secret), false, `Payload must not contain raw secret: ${secret}`);
  }

  const leakage = assertZeroSecretLeakage(payload, syntheticSecrets);
  assert.equal(leakage.isClean, true);

  console.log('[PASS] Discord adapter clamps oversized payloads and prevents credential leakage.');
}

function testDiscordApiErrorHandling() {
  // 1. Success (HTTP 204 No Content)
  const okResult = handleDiscordApiResponse(204);
  assert.equal(okResult.ok, true);
  assert.equal(okResult.shouldRetry, false);

  // 2. Rate limit (HTTP 429)
  const rateLimitResult = handleDiscordApiResponse(429, { retry_after: 3.5 });
  assert.equal(rateLimitResult.ok, false);
  assert.equal(rateLimitResult.shouldRetry, true);
  assert.equal(rateLimitResult.retryAfterMs, 3500);

  // 3. Bad Request (HTTP 400)
  const badReqResult = handleDiscordApiResponse(400, { message: 'Invalid Form Body' });
  assert.equal(badReqResult.ok, false);
  assert.equal(badReqResult.shouldRetry, false);
  assert.ok(badReqResult.error.includes('400 Bad Request'));

  // 4. Webhook deleted (HTTP 404)
  const notFoundResult = handleDiscordApiResponse(404);
  assert.equal(notFoundResult.ok, false);
  assert.equal(notFoundResult.shouldRetry, false);
  assert.ok(notFoundResult.error.includes('404 Not Found'));

  // 5. Server error (HTTP 502)
  const serverErrorResult = handleDiscordApiResponse(502);
  assert.equal(serverErrorResult.ok, false);
  assert.equal(serverErrorResult.shouldRetry, true);

  console.log('[PASS] Discord API responses (204, 429 rate limit, 400 bad request, 404, 502) handled accurately.');
}

function runTests() {
  testDiscordFormatting();
  testPayloadLimitsAndZeroExposure();
  testDiscordApiErrorHandling();
  console.log('[ALL PASS] Contribution 85 test suite passed.');
}

runTests();
