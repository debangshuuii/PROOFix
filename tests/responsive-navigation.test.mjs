import assert from 'node:assert/strict';
import {
  auditResponsiveNavigation,
} from '../src/lib/viewport/navigation-checker.ts';
import { getDefaultViewportPresets } from '../src/lib/viewport/presets.ts';

console.log('--- Testing Responsive Navigation Audit (Contribution 46) ---');

const presets = getDefaultViewportPresets();
const desktopProfile = presets.find((p) => p.id === 'desktop-1440x900');
const mobileProfile = presets.find((p) => p.id === 'mobile-390x844');

assert.ok(desktopProfile);
assert.ok(mobileProfile);

// Scenario 1: Broken Mobile Navigation (Desktop navigation works, but Mobile hamburger is missing)
const navStateMissingHamburger = {
  hasNavElement: true,
  isNavVisible: true,
  hasToggle: false, // Mobile menu button was never implemented or is hidden!
  isToggleVisible: false,
  toggleCanExpand: false,
  desktopLinks: ['/', '/about'],
  mobileDrawerLinks: [],
};

const desktopAudit1 = auditResponsiveNavigation(desktopProfile, navStateMissingHamburger);
const mobileAudit1 = auditResponsiveNavigation(mobileProfile, navStateMissingHamburger);

// Desktop MUST pass
assert.equal(desktopAudit1.passed, true, 'Desktop navigation must pass because desktop bar is visible');
assert.equal(desktopAudit1.profileId, 'desktop-1440x900');

// Mobile MUST fail and be reported against mobile profile
assert.equal(mobileAudit1.passed, false, 'Mobile navigation MUST fail due to missing toggle button');
assert.equal(mobileAudit1.profileId, 'mobile-390x844');
assert.ok(mobileAudit1.diagnosticMessage.includes('Mobile menu toggle button is missing or hidden'));
console.log(`[PASS] Broken mobile navigation reported specifically against ${mobileAudit1.profileName} while desktop passed.`);

// Scenario 2: Hamburger exists, but clicking it does not expand menu (JavaScript event handler missing)
const navStateBrokenToggle = {
  hasNavElement: true,
  isNavVisible: true,
  hasToggle: true,
  isToggleVisible: true,
  toggleCanExpand: false, // Broken click handler
  desktopLinks: ['/', '/about'],
  mobileDrawerLinks: [],
};

const mobileAudit2 = auditResponsiveNavigation(mobileProfile, navStateBrokenToggle);
assert.equal(mobileAudit2.passed, false);
assert.equal(mobileAudit2.profileId, 'mobile-390x844');
assert.ok(mobileAudit2.diagnosticMessage.includes('failed to expand navigation drawer'));
console.log(`[PASS] Non-functional menu toggle reported against ${mobileAudit2.profileName}.`);

// Scenario 3: Missing key destination link in mobile drawer
const navStateMissingKeyLink = {
  hasNavElement: true,
  isNavVisible: true,
  hasToggle: true,
  isToggleVisible: true,
  toggleCanExpand: true,
  desktopLinks: ['/', '/about'],
  mobileDrawerLinks: ['/'], // '/about' link was omitted from the mobile drawer
};

const mobileAudit3 = auditResponsiveNavigation(mobileProfile, navStateMissingKeyLink);
assert.equal(mobileAudit3.passed, false);
assert.equal(mobileAudit3.profileId, 'mobile-390x844');
assert.ok(mobileAudit3.missingLinks.includes('/about'));
assert.ok(mobileAudit3.diagnosticMessage.includes('missing key destination links [/about]'));
console.log(`[PASS] Missing mobile drawer link reported specifically against ${mobileAudit3.profileName}.`);

// Scenario 4: Fully compliant responsive navigation
const navStateCompliant = {
  hasNavElement: true,
  isNavVisible: true,
  hasToggle: true,
  isToggleVisible: true,
  toggleCanExpand: true,
  desktopLinks: ['/', '/about'],
  mobileDrawerLinks: ['/', '/about'],
};

const desktopAudit4 = auditResponsiveNavigation(desktopProfile, navStateCompliant);
const mobileAudit4 = auditResponsiveNavigation(mobileProfile, navStateCompliant);

assert.equal(desktopAudit4.passed, true);
assert.equal(mobileAudit4.passed, true);
console.log('[PASS] Fully compliant responsive navigation passes on both Desktop and Mobile.');

console.log('All Responsive Navigation Audit tests passed successfully.');
