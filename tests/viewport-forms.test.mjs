import assert from 'node:assert/strict';
import { verifyFormAtViewport } from '../src/lib/viewport/form-verifier.ts';
import { getDefaultViewportPresets } from '../src/lib/viewport/presets.ts';

console.log('--- Testing Form Verification at Different Viewports (Contribution 47) ---');

const presets = getDefaultViewportPresets();
const desktopProfile = presets.find((p) => p.id === 'desktop-1440x900');
const mobileProfile = presets.find((p) => p.id === 'mobile-390x844');

assert.ok(desktopProfile);
assert.ok(mobileProfile);

// Scenario 1: Form with small 20px inputs
// Fine on desktop with precision mouse pointer, but violates mobile touch target minimum (36px)
const compactForm = [
  {
    id: 'contact_form',
    action: 'https://api.example.com/v1/contacts',
    method: 'POST',
    fields: [
      {
        id: 'email_field',
        name: 'Email Address',
        type: 'email',
        required: true,
        width: 320,
        height: 22, // 22px height: too small for mobile touch target!
        isVisible: true,
        value: 'user@example.com',
      },
    ],
    submitButton: {
      text: 'Send Message',
      width: 120,
      height: 24, // 24px height: too small for mobile touch target!
      isVisible: true,
    },
  },
];

let interceptedActions = [];
const desktopResult1 = verifyFormAtViewport(desktopProfile, compactForm, {
  onInterceptSubmission: (action) => interceptedActions.push(action),
});

const mobileResult1 = verifyFormAtViewport(mobileProfile, compactForm, {
  onInterceptSubmission: (action) => interceptedActions.push(action),
});

// Desktop should pass because desktop mouse pointer doesn't require touch targets
assert.equal(desktopResult1.passed, true, 'Compact form passes on Desktop');
assert.equal(desktopResult1.profileId, 'desktop-1440x900');

// Mobile MUST fail specifically on touch target rule
assert.equal(mobileResult1.passed, false, 'Mobile MUST fail due to touch target size violations');
assert.equal(mobileResult1.profileId, 'mobile-390x844');
assert.equal(mobileResult1.touchTargetsPassed, false);
assert.ok(mobileResult1.violations.some((v) => v.rule === 'touch_target'));
console.log(`[PASS] Mobile-specific touch target failure reported against ${mobileResult1.profileName} while desktop passed.`);

// Scenario 2: Form submission interception (Safe submission without real network transmission)
assert.equal(desktopResult1.safeSubmissionVerified, true);
assert.equal(mobileResult1.safeSubmissionVerified, true);
assert.equal(desktopResult1.unintendedSubmissionsBlocked, 1);
assert.equal(mobileResult1.unintendedSubmissionsBlocked, 1);
assert.equal(interceptedActions.length, 2);
assert.equal(interceptedActions[0], 'https://api.example.com/v1/contacts');
console.log('[PASS] Unintended real form submissions successfully intercepted and blocked.');

// Scenario 3: Missing validation feedback when required field is empty
const unvalidatedForm = [
  {
    id: 'login_form',
    action: '/api/login',
    fields: [
      {
        id: 'password_field',
        name: 'Password',
        type: 'password',
        required: true,
        width: 350,
        height: 44,
        isVisible: true,
        value: '', // Empty required field
        hasValidationError: false, // UI failed to show validation feedback!
      },
    ],
    submitButton: {
      text: 'Log In',
      width: 150,
      height: 44,
      isVisible: true,
    },
  },
];

const validationResult = verifyFormAtViewport(desktopProfile, unvalidatedForm);
assert.equal(validationResult.passed, false);
assert.equal(validationResult.validationFeedbackPassed, false);
assert.ok(validationResult.violations.some((v) => v.rule === 'validation_feedback'));
console.log('[PASS] Missing validation feedback correctly caught.');

// Scenario 4: Fully compliant responsive form
const compliantForm = [
  {
    id: 'newsletter_form',
    action: '/api/newsletter',
    fields: [
      {
        id: 'sub_email',
        name: 'Email',
        type: 'email',
        required: true,
        width: 340,
        height: 48,
        isVisible: true,
        value: 'test@example.com',
      },
    ],
    submitButton: {
      text: 'Subscribe',
      width: 160,
      height: 48,
      isVisible: true,
    },
  },
];

const compliantMobile = verifyFormAtViewport(mobileProfile, compliantForm);
assert.equal(compliantMobile.passed, true);
assert.equal(compliantMobile.touchTargetsPassed, true);
assert.equal(compliantMobile.visibilityPassed, true);
console.log('[PASS] Compliant mobile form passes touch target, visibility, and safe submission.');

console.log('All Form Verification tests passed successfully.');
