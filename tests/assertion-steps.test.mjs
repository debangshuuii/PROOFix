import assert from 'node:assert/strict';
import { evaluateAssertion } from '../src/lib/journey/assertion-evaluator.ts';

console.log('--- Testing Assertion Steps & Failure Reporting (Contribution 55) ---');

// 1. assert_visible test
const visibleStep = {
  id: 'stp_assert_vis',
  order: 3,
  title: 'Check Dashboard Card Visible',
  action: 'assert_visible',
  target: { type: 'css', value: '.dashboard-card' },
};

// Passed condition
const visPass = evaluateAssertion(visibleStep, { elementFound: true, elementVisible: true });
assert.equal(visPass.passed, true);
assert.equal(visPass.errorMessage, undefined);

// Failed condition
const visFail = evaluateAssertion(visibleStep, { elementFound: false, elementVisible: false });
assert.equal(visFail.passed, false);
assert.equal(visFail.stepId, 'stp_assert_vis');
assert.equal(visFail.stepOrder, 3);
assert.equal(visFail.stepTitle, 'Check Dashboard Card Visible');
assert.ok(visFail.expectedValue.includes('visible'));
assert.ok(visFail.observedResult.includes('not visible'));
assert.ok(visFail.errorMessage?.includes('Step #3'));
console.log(`[PASS] assert_visible failure reported expected, observed, and step #${visFail.stepOrder}.`);

// 2. assert_text test
const textStep = {
  id: 'stp_assert_txt',
  order: 5,
  title: 'Assert Welcome Heading Text',
  action: 'assert_text',
  target: { type: 'css', value: 'h1' },
  params: {
    expectedText: 'Welcome, Alice',
    matchMode: 'exact',
  },
};

// Passed condition
const txtPass = evaluateAssertion(textStep, { elementText: 'Welcome, Alice' });
assert.equal(txtPass.passed, true);

// Failed condition (e.g. wrong user or error state)
const txtFail = evaluateAssertion(textStep, { elementText: 'Error 401: Unauthorized' });
assert.equal(txtFail.passed, false);
assert.equal(txtFail.stepId, 'stp_assert_txt');
assert.equal(txtFail.stepOrder, 5);
assert.ok(txtFail.expectedValue.includes('Welcome, Alice'));
assert.ok(txtFail.observedResult.includes('Error 401: Unauthorized'));
assert.ok(txtFail.errorMessage?.includes('Expected "Welcome, Alice", but observed "Error 401: Unauthorized"'));
console.log(`[PASS] assert_text failure reported expected "${txtFail.expectedValue}" vs observed "${txtFail.observedResult}".`);

// 3. assert_url test
const urlStep = {
  id: 'stp_assert_url',
  order: 6,
  title: 'Assert Redirected to Dashboard',
  action: 'assert_url',
  params: {
    expectedUrl: '/dashboard',
  },
};

// Passed condition
const urlPass = evaluateAssertion(urlStep, { currentUrl: 'http://localhost:4173/dashboard' });
assert.equal(urlPass.passed, true);

// Failed condition (remained on /login with error query param)
const urlFail = evaluateAssertion(urlStep, { currentUrl: 'http://localhost:4173/login?error=invalid_credentials' });
assert.equal(urlFail.passed, false);
assert.equal(urlFail.stepId, 'stp_assert_url');
assert.equal(urlFail.stepOrder, 6);
assert.ok(urlFail.expectedValue.includes('/dashboard'));
assert.ok(urlFail.observedResult.includes('/login?error=invalid_credentials'));
assert.ok(urlFail.errorMessage?.includes('Step #6'));
console.log(`[PASS] assert_url failure reported expected "${urlFail.expectedValue}" vs observed "${urlFail.observedResult}".`);

// 4. assert_form_value test
const formStep = {
  id: 'stp_assert_form',
  order: 7,
  title: 'Assert Pre-filled Email Value',
  action: 'assert_form_value',
  target: { type: 'label', value: 'Email' },
  params: {
    expectedValue: 'alice@example.com',
  },
};

const formPass = evaluateAssertion(formStep, { formValue: 'alice@example.com' });
assert.equal(formPass.passed, true);

const formFail = evaluateAssertion(formStep, { formValue: 'wrong@example.com' });
assert.equal(formFail.passed, false);
assert.equal(formFail.stepOrder, 7);
assert.ok(formFail.expectedValue.includes('alice@example.com'));
assert.ok(formFail.observedResult.includes('wrong@example.com'));
console.log(`[PASS] assert_form_value failure reported expected "${formFail.expectedValue}" vs observed "${formFail.observedResult}".`);

console.log('All Assertion Steps tests passed successfully.');
