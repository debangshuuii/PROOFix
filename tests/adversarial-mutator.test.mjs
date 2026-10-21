import assert from 'node:assert/strict';
import {
  generateAdversarialPayloads,
  NULL_BYTE_PAYLOADS,
  SQLI_PROBE_PAYLOADS,
  XSS_PROBE_PAYLOADS,
  UNICODE_HOMOGLYPH_PAYLOADS,
  AUTH_TAMPERING_PAYLOADS,
  OVERSIZED_PAYLOADS,
} from '../src/lib/fuzzing/adversarial-mutator.ts';

console.log('--- Testing Adversarial & Security Mutation Engine (Contribution 134) ---');

function testAdversarialPayloadGeneration() {
  const endpoint = {
    id: 'ep_users_search',
    path: '/api/v1/users/search',
    method: 'POST',
    parameters: [
      {
        name: 'q',
        in: 'query',
        required: true,
        type: 'string',
      },
    ],
    requestBody: {
      contentType: 'application/json',
      required: true,
      schema: {
        type: 'object',
        properties: {
          bio: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
    responses: {},
  };

  const payloads = generateAdversarialPayloads(endpoint);
  assert.ok(payloads.length > 30, 'Should generate comprehensive suite of security payloads');

  // 1. Verify Null Byte Strategy
  const nullPayloads = payloads.filter((p) => p.strategy === 'null_byte_injection');
  assert.ok(nullPayloads.length >= NULL_BYTE_PAYLOADS.length);
  assert.ok(nullPayloads.some((p) => typeof p.value === 'string' && p.value.includes('\u0000')));
  console.log('[PASS] Null byte payloads generated targeting string parameters and request fields.');

  // 2. Verify SQL Injection Strategy
  const sqliPayloads = payloads.filter((p) => p.strategy === 'sqli_adversarial');
  assert.ok(sqliPayloads.length >= SQLI_PROBE_PAYLOADS.length);
  assert.ok(sqliPayloads.some((p) => p.value === "' OR '1'='1"));
  console.log('[PASS] SQL injection vectors injected for database boundary testing.');

  // 3. Verify XSS Strategy
  const xssPayloads = payloads.filter((p) => p.strategy === 'xss_adversarial');
  assert.ok(xssPayloads.length >= XSS_PROBE_PAYLOADS.length);
  assert.ok(xssPayloads.some((p) => typeof p.value === 'string' && p.value.includes('<script>')));
  console.log('[PASS] Cross-site scripting polyglots generated.');

  // 4. Verify Unicode Homoglyphs
  const uniPayloads = payloads.filter((p) => p.strategy === 'unicode_homoglyphs');
  assert.ok(uniPayloads.length >= UNICODE_HOMOGLYPH_PAYLOADS.length);
  assert.ok(uniPayloads.some((p) => typeof p.value === 'string' && p.value.includes('\u202E')));
  console.log('[PASS] Unicode homoglyph, RTL override, and zero-width spaces generated.');

  // 5. Verify Oversized Payloads
  const overPayloads = payloads.filter((p) => p.strategy === 'oversized_payload');
  assert.ok(overPayloads.length >= OVERSIZED_PAYLOADS.length);
  assert.ok(overPayloads.some((p) => typeof p.value === 'string' && p.value.length === 64 * 1024));
  console.log('[PASS] Oversized 64KB/256KB/1MB payloads generated to test buffer boundaries.');

  // 6. Verify Auth Tampering
  const authPayloads = payloads.filter((p) => p.strategy === 'auth_tampering');
  assert.equal(authPayloads.length, AUTH_TAMPERING_PAYLOADS.length);
  assert.ok(authPayloads.some((p) => p.headers?.Authorization?.includes('invalid.jwt')));
  console.log('[PASS] Authentication tampering headers generated.');
}

testAdversarialPayloadGeneration();

console.log('\nAll Contribution 134 tests passed cleanly!');
