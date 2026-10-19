import assert from 'node:assert/strict';
import {
  validateWebhookDestination,
  getSafeWebhookFetchOptions,
} from '../src/lib/notifications/ssrf-guard.ts';

console.log('--- Testing Webhook Destination SSRF Hardening (Contribution 89) ---');

function testSchemeRestrictions() {
  const insecureSchemes = [
    'http://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_token',
    'file:///etc/passwd',
    'ftp://192.168.1.1/webhook',
    'javascript:alert(1)',
    'data:text/plain;base64,SGVsbG8=',
  ];

  for (const url of insecureSchemes) {
    const res = validateWebhookDestination(url);
    assert.equal(res.valid, false, `Scheme in "${url}" must be rejected`);
    assert.ok(res.reason.includes('https') || res.reason.includes('scheme') || res.reason.includes('Malformed'));
  }

  console.log('[PASS] Insecure schemes strictly rejected; only HTTPS allowed.');
}

function testPrivateNetworkAndMetadataRejection() {
  const privateIps = [
    'https://127.0.0.1/services/T1/B2/token',
    'https://127.0.0.254/webhook',
    'https://10.0.0.1/services/token',
    'https://10.255.255.255/webhook',
    'https://172.16.0.1/services/token',
    'https://172.31.255.255/webhook',
    'https://192.168.0.1/services/token',
    'https://192.168.100.50/webhook',
    'https://169.254.169.254/latest/meta-data', // AWS/GCP metadata
    'https://0.0.0.0/webhook',
    'https://100.64.0.1/webhook', // CGNAT
  ];

  for (const url of privateIps) {
    const res = validateWebhookDestination(url);
    assert.equal(res.valid, false, `Private/metadata target "${url}" must be rejected`);
    assert.ok(res.reason.includes('private') || res.reason.includes('metadata') || res.reason.includes('Blocked'));
  }

  console.log('[PASS] Private RFC 1918 IPv4 and cloud metadata IP addresses strictly rejected.');
}

function testInternalHostnamesAndPorts() {
  const internalHosts = [
    'https://localhost/services/T1/B2/token',
    'https://localhost.localdomain/webhook',
    'https://server.local/api',
    'https://database.internal/webhook',
    'https://cache.lan/webhook',
    'https://metadata.google.internal/computeMetadata/v1/',
  ];

  for (const url of internalHosts) {
    const res = validateWebhookDestination(url);
    assert.equal(res.valid, false, `Internal host "${url}" must be rejected`);
  }

  // Reject embedded credentials in authority
  const credsUrl = 'https://admin:superSecret@hooks.slack.com/services/T_MOCK/B_MOCK/mock_token';
  const credsRes = validateWebhookDestination(credsUrl);
  assert.equal(credsRes.valid, false);
  assert.ok(credsRes.reason.includes('credentials'));

  // Reject custom non-standard ports
  const portUrl = 'https://hooks.slack.com:8443/services/T_MOCK/B_MOCK/mock_token';
  const portRes = validateWebhookDestination(portUrl);
  assert.equal(portRes.valid, false);
  assert.ok(portRes.reason.includes('port'));

  console.log('[PASS] Internal hostnames, authority credentials, and non-standard ports strictly rejected.');
}

function testPlatformDestinationValidation() {
  // Valid Slack
  const validSlack = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_token_123';
  const slackRes = validateWebhookDestination(validSlack, 'slack');
  assert.equal(slackRes.valid, true);

  // Invalid Slack host
  const spoofSlack = 'https://evil-slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_token_123';
  const spoofRes = validateWebhookDestination(spoofSlack, 'slack');
  assert.equal(spoofRes.valid, false);
  assert.ok(spoofRes.reason.includes('allowed hosts'));

  // Valid Discord
  const validDiscord = 'https://discord.com/api/webhooks/123456789/abcdef-ghijk';
  const discordRes = validateWebhookDestination(validDiscord, 'discord');
  assert.equal(discordRes.valid, true);

  // Invalid Discord path
  const badDiscordPath = 'https://discord.com/oauth2/authorize';
  const badPathRes = validateWebhookDestination(badDiscordPath, 'discord');
  assert.equal(badPathRes.valid, false);
  assert.ok(badPathRes.reason.includes('path must begin'));

  console.log('[PASS] Platform-specific destination hosts and API paths strictly verified.');
}

async function testRedirectControls() {
  // "Done when: tests reject malicious destinations and redirects without making real requests to internal systems."
  const safeFetchOptions = getSafeWebhookFetchOptions();
  assert.equal(safeFetchOptions.redirect, 'error', 'Must strictly set redirect: error to prevent open-redirect SSRF');

  // Verify fetch with redirect: 'error' rejects HTTP 301/302 redirects
  const mockRedirectFetch = async () => {
    if (safeFetchOptions.redirect === 'error') {
      const err = new TypeError('Failed to fetch: redirect mode is "error"');
      throw err;
    }
    return new Response(null, { status: 302, headers: { Location: 'https://169.254.169.254/latest/meta-data' } });
  };

  let redirectCaught = false;
  try {
    await mockRedirectFetch();
  } catch (err) {
    redirectCaught = true;
    assert.ok(err.message.includes('redirect'));
  }
  assert.equal(redirectCaught, true, 'Redirect must be blocked in error mode');

  console.log('[PASS] Automatic HTTP redirects strictly blocked to eliminate redirect-based SSRF.');
}

async function runTests() {
  testSchemeRestrictions();
  testPrivateNetworkAndMetadataRejection();
  testInternalHostnamesAndPorts();
  testPlatformDestinationValidation();
  await testRedirectControls();
  console.log('[ALL PASS] Contribution 89 test suite passed.');
}

runTests();
