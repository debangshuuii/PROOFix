import assert from 'node:assert/strict';
import {
  preflightValidateJourney,
  executeJourney,
} from '../src/lib/journey/execution-adapter.ts';

console.log('--- Testing Safe Journey Execution Adapter (Contribution 58) ---');

const baseValidJourney = {
  id: 'jny_safe_adapter_test',
  projectId: 'proj_fixture_01',
  ownerId: 'usr_default',
  title: 'Safe Execution Test',
  schemaVersion: '1.0.0',
  config: {
    baseUrl: 'http://localhost:4173',
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  steps: [
    { id: 's1', order: 1, title: 'Nav Home', action: 'navigate', params: { url: '/store' } },
    { id: 's2', order: 2, title: 'Click Item', action: 'click', target: { type: 'role_name', role: 'button', name: 'Buy' } },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 1. Preflight Rejection: Malformed steps (missing required params/target)
const malformedJourney = {
  ...baseValidJourney,
  steps: [
    { id: 's1', order: 1, title: 'Bad Fill', action: 'fill' }, // Missing target and params.value!
  ],
};

const malformedPreflight = preflightValidateJourney(malformedJourney);
assert.equal(malformedPreflight.valid, false);
assert.ok(malformedPreflight.errors.length > 0);

await assert.rejects(async () => {
  await executeJourney(malformedJourney);
}, /Journey pre-execution validation failed/);
console.log('[PASS] Malformed steps rejected before execution.');

// 2. Preflight Rejection: Unauthorized destination (external phishing or dangerous protocol)
const dangerousProtocolJourney = {
  ...baseValidJourney,
  steps: [
    { id: 's1', order: 1, title: 'Nav Bad', action: 'navigate', params: { url: 'javascript:alert(1)' } },
  ],
};

const dangerousPreflight = preflightValidateJourney(dangerousProtocolJourney);
assert.equal(dangerousPreflight.valid, false);
assert.ok(dangerousPreflight.errors.some((e) => e.includes('unauthorized destination')));

await assert.rejects(async () => {
  await executeJourney(dangerousProtocolJourney);
}, /unauthorized destination/);

const unauthorizedHostJourney = {
  ...baseValidJourney,
  steps: [
    { id: 's1', order: 1, title: 'Nav External', action: 'navigate', params: { url: 'https://evil-hacker.com/steal' } },
  ],
};

await assert.rejects(async () => {
  await executeJourney(unauthorizedHostJourney, { allowedHosts: ['localhost'] });
}, /unauthorized destination/);
console.log('[PASS] Unauthorized destinations (dangerous protocol & external hosts) rejected before execution.');

// 3. Preflight Rejection: Unsupported action (e.g. eval or shell)
const unsupportedActionJourney = {
  ...baseValidJourney,
  steps: [
    { id: 's1', order: 1, title: 'Eval Script', action: 'eval_arbitrary_code' },
  ],
};

const unsupportedPreflight = preflightValidateJourney(unsupportedActionJourney);
assert.equal(unsupportedPreflight.valid, false);
assert.ok(unsupportedPreflight.errors.some((e) => e.includes('unsupported action')));

await assert.rejects(async () => {
  await executeJourney(unsupportedActionJourney);
}, /unsupported action/);
console.log('[PASS] Unsupported arbitrary actions strictly rejected before execution.');

// 4. Successful execution of approved safe journey
const runResult = await executeJourney(baseValidJourney);
assert.equal(runResult.status, 'passed');
assert.equal(runResult.totalSteps, 2);
assert.equal(runResult.passedSteps, 2);
assert.equal(runResult.failedSteps, 0);
assert.equal(runResult.stepResults.length, 2);
console.log('[PASS] Approved journey converted into Playwright actions and executed cleanly.');

console.log('All Safe Journey Execution Adapter tests passed successfully.');
