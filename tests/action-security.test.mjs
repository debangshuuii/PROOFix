import assert from 'assert';
import {
  sanitizeActionLog,
  MINIMUM_PERMISSIONS,
} from '../src/action/security.ts';

console.log('--- TEST: Action Security, Secret Redaction & Permissions Hardening ---');

// Test 1: Redact GitHub Personal Access Token
console.log('[TEST 1] Redact GitHub Personal Access Token');
const rawLog1 = 'Connecting to GitHub API with token ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8...';
const sanitized1 = sanitizeActionLog(rawLog1);
assert.ok(!sanitized1.includes('ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8'));
assert.ok(sanitized1.includes('[REDACTED_GITHUB_TOKEN]'));
console.log('  -> GitHub PAT redacted properly.');

// Test 2: Redact Database credentials
console.log('[TEST 2] Redact Database connection URL password');
const rawLog2 = 'Database initialized at postgres://app_user:ultra_secure_password_999@127.0.0.1:5432/prod_db';
const sanitized2 = sanitizeActionLog(rawLog2);
assert.ok(!sanitized2.includes('ultra_secure_password_999'));
assert.ok(sanitized2.includes('[REDACTED_PASSWORD]'));
console.log('  -> Database password redacted cleanly.');

// Test 3: Redact AI API Keys
console.log('[TEST 3] Redact OpenAI & Anthropic API keys');
const rawLog3 = 'AI Diagnoser invoking API with key sk-1234567890abcdef1234567890abcdef and sk-ant-api03-abcdefg1234567890abcdefg';
const sanitized3 = sanitizeActionLog(rawLog3);
assert.ok(!sanitized3.includes('sk-1234567890abcdef1234567890abcdef'));
assert.ok(!sanitized3.includes('sk-ant-api03-abcdefg1234567890abcdefg'));
assert.ok(sanitized3.includes('[REDACTED_OPENAI_KEY]'));
assert.ok(sanitized3.includes('[REDACTED_ANTHROPIC_KEY]'));
console.log('  -> AI service API keys redacted.');

// Test 4: Redact custom injected secrets
console.log('[TEST 4] Redact custom workflow environment secret');
const customSecret = 'SUPER_CONFIDENTIAL_TOKEN_XYZ_987';
const rawLog4 = `Server environment includes AUTH_TOKEN=${customSecret}`;
const sanitized4 = sanitizeActionLog(rawLog4, [customSecret]);
assert.ok(!sanitized4.includes(customSecret));
assert.ok(sanitized4.includes('[REDACTED_ENV_SECRET]'));
console.log('  -> Custom injected environment secrets redacted.');

// Test 5: Verify Minimum Permissions Policy
console.log('[TEST 5] Verify Minimum Permissions Policy');
assert.strictEqual(MINIMUM_PERMISSIONS.readOnly.contents, 'read');
assert.strictEqual(MINIMUM_PERMISSIONS.standard.contents, 'read');
assert.strictEqual(MINIMUM_PERMISSIONS.standard.actions, 'read');
assert.strictEqual(MINIMUM_PERMISSIONS.prProposal['pull-requests'], 'write');
console.log('  -> Minimum permission dictionaries adhere to least-privilege principles.');

console.log('\n--- All Contribution 27 Security & Permissions Tests Passed! ---');
