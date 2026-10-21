import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { GitWebhookVerifier } from '../src/lib/integrations/webhook-verifier.ts';

console.log('--- Testing HMAC-SHA256 Signature Validator (Contribution 192) ---');

const verifier = new GitWebhookVerifier();
const secret = 'webhook_secret_super_safe_key_123';
const payload = JSON.stringify({ action: 'opened', number: 42 });

// 1. Valid GitHub Signature
const validHmac = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
const validCheck = verifier.verifyGitHubSignature(payload, validHmac, secret);
assert.equal(validCheck.valid, true);
assert.equal(validCheck.error, undefined);
console.log('✅ Valid GitHub HMAC-SHA256 signature accepted');

// 2. Tampered Payload
const tamperedCheck = verifier.verifyGitHubSignature(payload + 'tampered', validHmac, secret);
assert.equal(tamperedCheck.valid, false);
assert.ok(tamperedCheck.error.includes('mismatch'));
console.log('✅ Tampered payload signature rejected');

// 3. Wrong Secret
const wrongSecretCheck = verifier.verifyGitHubSignature(payload, validHmac, 'wrong_secret');
assert.equal(wrongSecretCheck.valid, false);
console.log('✅ Signature signed with wrong secret rejected');

// 4. Missing Header
const missingCheck = verifier.verifyGitHubSignature(payload, null, secret);
assert.equal(missingCheck.valid, false);
assert.ok(missingCheck.error.includes('Missing'));
console.log('✅ Missing signature header safely rejected');

// 5. GitLab Token Verification
const gitlabValid = verifier.verifyGitLabToken(secret, secret);
assert.equal(gitlabValid.valid, true);
assert.equal(gitlabValid.provider, 'gitlab');

const gitlabInvalid = verifier.verifyGitLabToken('attacker_token', secret);
assert.equal(gitlabInvalid.valid, false);
console.log('✅ GitLab token verification validated');

console.log('✅ Contribution 192 tests passed cleanly!');
