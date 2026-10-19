import assert from 'assert';
import path from 'path';
import {
  validateActionInputs,
  validateActionYml,
} from '../src/action/validator.ts';

console.log('--- TEST: GitHub Action Interface & action.yml Validation ---');

const actionYmlPath = path.join(process.cwd(), 'action.yml');

// Test 1: Validate action.yml structural specification
console.log('[TEST 1] Validate action.yml specification');
const ymlCheck = validateActionYml(actionYmlPath);
assert.strictEqual(ymlCheck.valid, true, `action.yml must be valid: ${ymlCheck.errors.join('; ')}`);
assert.strictEqual(ymlCheck.errors.length, 0);
console.log('  -> action.yml has all required inputs, outputs, runs definitions, and branding.');

// Test 2: Default inputs validation
console.log('[TEST 2] Default inputs parsing');
const defaultsCheck = validateActionInputs({});
assert.strictEqual(defaultsCheck.valid, true);
assert.ok(defaultsCheck.inputs);
assert.strictEqual(defaultsCheck.inputs.projectPath, '.');
assert.strictEqual(defaultsCheck.inputs.verificationProfile, 'full');
assert.strictEqual(defaultsCheck.inputs.failOnRegression, true);
assert.strictEqual(defaultsCheck.inputs.timeoutMinutes, 15);
assert.strictEqual(defaultsCheck.inputs.retries, 2);
assert.strictEqual(defaultsCheck.inputs.generateSummary, true);
assert.strictEqual(defaultsCheck.inputs.uploadArtifacts, true);
console.log('  -> Default inputs populated accurately.');

// Test 3: Reject unsupported verification profile
console.log('[TEST 3] Rejects unsupported verification-profile');
const invalidProfile = validateActionInputs({
  'verification-profile': 'unsupported_turbo_mode',
});
assert.strictEqual(invalidProfile.valid, false);
assert.ok(
  invalidProfile.errors.some((e) => e.includes('Invalid "verification-profile"')),
  'Error message must state invalid verification-profile'
);
console.log('  -> Rejected unsupported profile with clear error message.');

// Test 4: Reject out-of-range timeout
console.log('[TEST 4] Rejects invalid timeout values');
const negativeTimeout = validateActionInputs({ 'timeout-minutes': '-5' });
assert.strictEqual(negativeTimeout.valid, false);
assert.ok(negativeTimeout.errors.some((e) => e.includes('timeout-minutes')));

const hugeTimeout = validateActionInputs({ 'timeout-minutes': '500' });
assert.strictEqual(hugeTimeout.valid, false);
assert.ok(hugeTimeout.errors.some((e) => e.includes('timeout-minutes')));
console.log('  -> Timeouts outside 1-120 range safely rejected.');

// Test 5: Reject invalid retries
console.log('[TEST 5] Rejects invalid retries');
const badRetries = validateActionInputs({ retries: '10' });
assert.strictEqual(badRetries.valid, false);
assert.ok(badRetries.errors.some((e) => e.includes('retries')));
console.log('  -> Retries exceeding 5 rejected.');

// Test 6: Custom valid configuration
console.log('[TEST 6] Validates custom configuration');
const custom = validateActionInputs({
  'project-path': 'src/fixtures/sample-app',
  'verification-profile': 'visual',
  'fail-on-regression': 'false',
  'timeout-minutes': '10',
  retries: '3',
});
assert.strictEqual(custom.valid, true);
assert.strictEqual(custom.inputs?.projectPath, 'src/fixtures/sample-app');
assert.strictEqual(custom.inputs?.verificationProfile, 'visual');
assert.strictEqual(custom.inputs?.failOnRegression, false);
assert.strictEqual(custom.inputs?.retries, 3);
console.log('  -> Custom configuration successfully validated.');

console.log('\n--- All Contribution 21 Action Interface Tests Passed! ---');
