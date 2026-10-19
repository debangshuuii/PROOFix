import assert from 'node:assert/strict';
import { formatSlackMessage } from '../src/lib/notifications/slack-adapter.ts';
import { assertZeroSecretLeakage } from '../src/lib/notifications/secret-vault.ts';

console.log('--- Testing Slack Notification Adapter (Contribution 84) ---');

const syntheticSecrets = [
  'AKIAIOSFODNN7EXAMPLE',
  'ghp_abcdef1234567890abcdef1234567890abcd',
  'postgres://admin:TopSecretPassword123!@db.internal:5432/app',
];

function testSlackFormatting() {
  const event = {
    id: 'ev_slack_01',
    eventType: 'run.failed',
    projectId: 'proj_ecommerce',
    projectName: 'E-Commerce Storefront',
    runId: 'run_999',
    runNumber: 42,
    status: 'failed',
    branch: 'release/v2.1',
    commitHash: 'f4b3c2d1e0a9',
    commitMessage: 'Add checkout payment gateway',
    reportUrl: 'https://proofix.dev/projects/proj_ecommerce/runs/run_999',
    summary: 'Checkout button crashed with 500 Internal Server Error in payment webhook route.',
    regressions: [
      {
        title: 'Checkout API 500 error',
        route: '/api/checkout',
        severity: 'critical',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const payload = formatSlackMessage(event);

  // 1. Verify Slack Block Kit structure
  assert.ok(typeof payload.text === 'string' && payload.text.length > 0);
  assert.ok(Array.isArray(payload.blocks));
  assert.ok(payload.blocks.length >= 4);

  // 2. Verify project identity, status, commit, and report link
  // "containing project identity, status, commit, and report link where available"
  const serialized = JSON.stringify(payload);
  assert.ok(serialized.includes('E-Commerce Storefront'), 'Must contain project name');
  assert.ok(serialized.includes('Verification Failed'), 'Must contain status');
  assert.ok(serialized.includes('f4b3c2d'), 'Must contain short commit hash');
  assert.ok(serialized.includes('https://proofix.dev/projects/proj_ecommerce/runs/run_999'), 'Must contain report link');

  // Verify Block types
  const header = payload.blocks.find((b) => b.type === 'header');
  assert.ok(header, 'Must contain a header block');

  const fieldsBlock = payload.blocks.find((b) => b.type === 'section' && b.fields);
  assert.ok(fieldsBlock, 'Must contain a fields section');
  const projectField = fieldsBlock.fields.find((f) => f.text.includes('E-Commerce Storefront'));
  assert.ok(projectField, 'Must include project field in section');

  console.log('[PASS] Slack Block Kit payload formats project identity, status, commit, and report link.');
}

function testZeroSecretsAndZeroRawCode() {
  // Input event containing synthetic secrets and raw source code
  const dirtyEvent = {
    id: 'ev_sec_alert',
    eventType: 'security.alert',
    projectId: 'proj_fintech',
    projectName: 'Fintech API',
    runId: 'run_100',
    summary: `Found secret token ${syntheticSecrets[0]} and GitHub key ${syntheticSecrets[1]} in \`\`\`const apiKey = "${syntheticSecrets[2]}";\`\`\``,
    securityAlerts: [
      {
        type: 'secret',
        count: 2,
        maxSeverity: 'critical',
      },
      {
        type: 'vulnerability',
        count: 1,
        maxSeverity: 'high',
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const payload = formatSlackMessage(dirtyEvent);
  const serialized = JSON.stringify(payload);

  // "Done when: payloads pass adapter tests and contain no raw source code or secrets."
  for (const secret of syntheticSecrets) {
    assert.equal(
      serialized.includes(secret),
      false,
      `Payload must NOT contain raw secret: ${secret}`
    );
  }

  // Raw multi-line code block must be stripped/omitted
  assert.equal(serialized.includes('const apiKey ='), false, 'Raw source code must not appear in Slack payload');
  assert.ok(serialized.includes('Security Preflight Findings'));

  const check = assertZeroSecretLeakage(payload, syntheticSecrets);
  assert.equal(check.isClean, true, 'Zero secret leakage verified');

  console.log('[PASS] Payloads strictly exclude raw source code and conceal credential values.');
}

function testSupportedEventTypes() {
  const events = ['run.started', 'run.completed', 'run.failed', 'regression.detected', 'security.alert'];

  for (const evType of events) {
    const payload = formatSlackMessage({
      id: `ev_${evType}`,
      eventType: evType,
      projectId: 'proj_test',
      projectName: 'Test App',
      summary: `Testing event: ${evType}`,
      timestamp: new Date().toISOString(),
    });

    assert.ok(payload.blocks.length >= 3);
    assert.ok(payload.text.includes('Test App'));
  }

  console.log('[PASS] All 5 supported notification event types format cleanly for Slack.');
}

function runTests() {
  testSlackFormatting();
  testZeroSecretsAndZeroRawCode();
  testSupportedEventTypes();
  console.log('[ALL PASS] Contribution 84 test suite passed.');
}

runTests();
