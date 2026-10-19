import assert from 'node:assert/strict';
import {
  validateSafeUrl,
  mapSelectorToPlaywright,
  mapInteractionToPlaywright,
} from '../src/lib/journey/interaction-mapper.ts';

console.log('--- Testing Navigation & Interaction Mapper (Contribution 54) ---');

// 1. Navigation URL safety validation
assert.equal(validateSafeUrl('/login').safe, true);
assert.equal(validateSafeUrl('http://localhost:4173/dashboard').safe, true);

// Reject dangerous protocols
assert.equal(validateSafeUrl('javascript:alert(document.cookie)').safe, false);
assert.equal(validateSafeUrl('file:///etc/passwd').safe, false);
assert.equal(validateSafeUrl('data:text/html,<script>alert(1)</script>').safe, false);

// Reject unauthorized external hosts when allowedHosts is specified
const hostCheck = validateSafeUrl('https://evil-phishing.com/steal', ['localhost', 'proofix.dev']);
assert.equal(hostCheck.safe, false);
assert.ok(hostCheck.error?.includes('not within allowed destination hosts'));
console.log('[PASS] Navigation URLs strictly validated and dangerous vectors rejected.');

// 2. Click by accessible role and name
const clickStep = {
  id: 'stp_click_btn',
  order: 1,
  title: 'Click Login Button',
  action: 'click',
  target: {
    type: 'role_name',
    role: 'button',
    name: 'Sign In',
    value: 'Sign In',
  },
};

const clickPlan = mapInteractionToPlaywright(clickStep);
assert.equal(clickPlan.isSafe, true);
assert.equal(clickPlan.method, 'click');
assert.equal(clickPlan.locatorCode, "page.getByRole('button', { name: 'Sign In' })");
assert.equal(clickPlan.actionCode, "await page.getByRole('button', { name: 'Sign In' }).click();");
console.log('[PASS] Click maps to Playwright accessible role/name operation.');

// 3. Fill labeled input field
const fillStep = {
  id: 'stp_fill_email',
  order: 2,
  title: 'Fill Email Address',
  action: 'fill',
  target: {
    type: 'label',
    value: 'Email Address',
  },
  params: {
    value: 'lead@proofix.dev',
  },
};

const fillPlan = mapInteractionToPlaywright(fillStep);
assert.equal(fillPlan.isSafe, true);
assert.equal(fillPlan.method, 'fill');
assert.equal(fillPlan.locatorCode, "page.getByLabel('Email Address')");
assert.equal(fillPlan.actionCode, "await page.getByLabel('Email Address').fill('lead@proofix.dev');");
console.log('[PASS] Fill maps to Playwright getByLabel fill operation.');

// 4. Select dropdown option
const selectStep = {
  id: 'stp_select_country',
  order: 3,
  title: 'Choose Country',
  action: 'select_option',
  target: {
    type: 'css',
    value: '#country-select',
  },
  params: {
    option: 'Canada',
  },
};

const selectPlan = mapInteractionToPlaywright(selectStep);
assert.equal(selectPlan.isSafe, true);
assert.equal(selectPlan.method, 'selectOption');
assert.equal(selectPlan.actionCode, "await page.locator('#country-select').selectOption('Canada');");
console.log('[PASS] Select option maps to Playwright selectOption operation.');

// 5. Arbitrary code injection rejection
assert.throws(() => {
  mapSelectorToPlaywright({
    type: 'css',
    value: '<script>alert(1)</script>',
  });
}, /Potentially malicious CSS selector/);
console.log('[PASS] Arbitrary script execution prevented.');

console.log('All Navigation & Interaction Mapper tests passed successfully.');
