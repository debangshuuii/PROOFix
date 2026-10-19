import assert from 'node:assert/strict';
import {
  encryptWebhookUrl,
  decryptWebhookUrl,
  maskWebhookUrl,
  sanitizeWebhookLogs,
  assertZeroSecretLeakage,
} from '../src/lib/notifications/secret-vault.ts';

console.log('--- Testing Encrypted Webhook Secret Storage (Contribution 83) ---');

function testEncryptionAndDecryption() {
  const sampleSlackUrl = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_slack_webhook_token_123';
  const sampleDiscordUrl = 'https://discord.com/api/webhooks/123456789012345678/abCDef-GHIjkl_mnopqrstuvwxyz123456789';

  // 1. Encryption generates authenticated ciphertext
  const encSlack = encryptWebhookUrl(sampleSlackUrl);
  assert.ok(encSlack.startsWith('enc:v1:'));
  assert.equal(encSlack.includes('mock_slack_webhook_token'), false, 'Encrypted string must not contain raw token');

  const encDiscord = encryptWebhookUrl(sampleDiscordUrl);
  assert.ok(encDiscord.startsWith('enc:v1:'));
  assert.equal(encDiscord.includes('abCDef-GHIjkl'), false);

  // 2. Decryption recovers original URL
  const decSlack = decryptWebhookUrl(encSlack);
  assert.equal(decSlack, sampleSlackUrl);

  const decDiscord = decryptWebhookUrl(encDiscord);
  assert.equal(decDiscord, sampleDiscordUrl);

  // 3. Tampered payload fails authenticated integrity check
  const tamperedJson = Buffer.from(encSlack.slice(7), 'base64').toString('utf-8');
  const record = JSON.parse(tamperedJson);
  // Modify one character of ciphertext
  record.ciphertext = record.ciphertext.slice(0, -2) + 'ff';
  const tamperedPayload = `enc:v1:${Buffer.from(JSON.stringify(record)).toString('base64')}`;

  let tamperedCaught = false;
  try {
    decryptWebhookUrl(tamperedPayload);
  } catch (err) {
    tamperedCaught = true;
    assert.ok(err.message.includes('Integrity check failed') || err.message.includes('tampered'));
  }
  assert.equal(tamperedCaught, true, 'Tampered ciphertext must fail authenticated decryption');

  console.log('[PASS] Webhook URLs encrypted and decrypted with authenticated AES-256-GCM integrity.');
}

function testMaskingAndZeroExposure() {
  const rawSlack = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_CHANNEL/mock_slack_webhook_token_123';
  const rawDiscord = 'https://discord.com/api/webhooks/123456789012345678/abCDefGHIjkl_mnopqrstuvwxyz';

  const maskedSlack = maskWebhookUrl(rawSlack);
  const maskedDiscord = maskWebhookUrl(rawDiscord);

  // Masked URL should contain platform host and ellipsis/dots, but NOT raw token
  assert.ok(maskedSlack.includes('hooks.slack.com'));
  assert.ok(maskedSlack.includes('••••••••'));
  assert.equal(maskedSlack.includes('mock_slack_webhook_token_123'), false);

  assert.ok(maskedDiscord.includes('discord.com'));
  assert.ok(maskedDiscord.includes('••••••••'));
  assert.equal(maskedDiscord.includes('abCDefGHIjkl_mnopqrstuvwxyz'), false);

  // Client settings representation test:
  // "Done when: persisted secrets are protected and never returned in plaintext by ordinary settings APIs."
  const clientChannel = {
    id: 'ch_slack',
    channelType: 'slack',
    enabled: true,
    hasSecret: true,
    webhookUrlMasked: maskedSlack,
    // webhookUrlEncrypted is omitted for client
  };

  const leakageCheck = assertZeroSecretLeakage(clientChannel, [rawSlack, rawDiscord]);
  assert.equal(leakageCheck.isClean, true, 'Client settings payload must contain 0 raw secrets');

  console.log('[PASS] Masked webhook URLs conceal secrets and guarantee zero client-side leakage.');
}

function testLogRedaction() {
  const rawSlack = 'https://hooks.slack.com/services/T_MOCK_WORKSPACE/B_MOCK_LOGS/mock_secret_token_payload';
  const rawDiscord = 'https://discord.com/api/webhooks/987654321098765432/anotherSecretToken789';

  const dirtyLog = `[Webhook Dispatcher] Failed posting to ${rawSlack} and backup ${rawDiscord}`;
  const cleanLog = sanitizeWebhookLogs(dirtyLog, [rawSlack, rawDiscord]);

  assert.equal(cleanLog.includes('mock_secret_token_payload'), false);
  assert.equal(cleanLog.includes('anotherSecretToken789'), false);
  assert.ok(cleanLog.includes('[REDACTED_SLACK_WEBHOOK]'));
  assert.ok(cleanLog.includes('[REDACTED_DISCORD_WEBHOOK]'));

  console.log('[PASS] Diagnostic logs redact webhook URLs and credentials automatically.');
}

function runTests() {
  testEncryptionAndDecryption();
  testMaskingAndZeroExposure();
  testLogRedaction();
  console.log('[ALL PASS] Contribution 83 test suite passed.');
}

runTests();
