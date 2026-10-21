import assert from 'node:assert/strict';
import {
  getProviderPreset,
  getAllAvailablePresets,
  PRESET_FAULT_RULES,
} from '../src/lib/replay/provider-presets.ts';

console.log('--- Testing Pre-Configured Provider Presets (Contribution 147) ---');

function testProviderPresetsRetrieval() {
  // 1. Stripe Success
  const stripeSuccess = getProviderPreset('stripe', 'payment-intent-success');
  assert.ok(stripeSuccess);
  assert.equal(stripeSuccess.interactions[0].provider, 'stripe');
  assert.equal(stripeSuccess.interactions[0].response.statusCode, 200);
  assert.ok(stripeSuccess.interactions[0].response.body.includes('succeeded'));

  // 2. Stripe Card Declined
  const stripeDeclined = getProviderPreset('stripe', 'card-declined');
  assert.ok(stripeDeclined);
  assert.equal(stripeDeclined.interactions[0].response.statusCode, 402);
  assert.ok(stripeDeclined.interactions[0].response.body.includes('card_declined'));

  // 3. GitHub
  const ghPreset = getProviderPreset('github');
  assert.ok(ghPreset);
  assert.equal(ghPreset.interactions[0].provider, 'github');
  assert.ok(ghPreset.interactions[0].response.headers['x-ratelimit-limit']);

  // 4. OpenAI
  const openaiPreset = getProviderPreset('openai');
  assert.ok(openaiPreset);
  assert.equal(openaiPreset.interactions[0].provider, 'openai');
  assert.ok(openaiPreset.interactions[0].response.body.includes('chat.completion'));

  // 5. Twilio
  const twilioPreset = getProviderPreset('twilio');
  assert.ok(twilioPreset);
  assert.equal(twilioPreset.interactions[0].response.statusCode, 201);
  assert.ok(twilioPreset.interactions[0].response.body.includes('SM1234567890abcdef'));

  console.log('[PASS] Out-of-the-box SaaS presets (Stripe, GitHub, OpenAI, Twilio) instantiated accurately.');
}

function testPresetFaultRules() {
  const stripeRateLimit = PRESET_FAULT_RULES['stripe_rate_limit'];
  assert.ok(stripeRateLimit);
  assert.equal(stripeRateLimit.faultType, 'rate_limit_429');
  assert.equal(stripeRateLimit.params.retryAfterSecs, 60);

  const ghRate = PRESET_FAULT_RULES['github_secondary_rate_limit'];
  assert.ok(ghRate);
  assert.equal(ghRate.params.statusCode, 403);
  assert.ok(ghRate.params.errorMessage.includes('secondary rate limit'));

  const openaiQuota = PRESET_FAULT_RULES['openai_quota_exceeded'];
  assert.ok(openaiQuota);
  assert.equal(openaiQuota.params.statusCode, 429);
  assert.ok(openaiQuota.params.errorMessage.includes('exceeded your current quota'));

  console.log('[PASS] Pre-configured chaos fault injection profiles verified.');
}

function testAvailablePresetsListing() {
  const presets = getAllAvailablePresets();
  assert.ok(presets.length >= 4);
  assert.ok(presets.some((p) => p.provider === 'stripe'));
  assert.ok(presets.some((p) => p.provider === 'github'));
  assert.ok(presets.some((p) => p.provider === 'openai'));
  assert.ok(presets.some((p) => p.provider === 'twilio'));
  console.log('[PASS] Preset catalog enumerates all supported providers and scenarios.');
}

testProviderPresetsRetrieval();
testPresetFaultRules();
testAvailablePresetsListing();

console.log('\nAll Contribution 147 tests passed cleanly!');
