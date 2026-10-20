/**
 * PROOFix Master Accessibility Auditing CI Regression Test Suite
 * Covering Contributions 94 and 95
 */

import assert from 'node:assert/strict';
import {
  calculateAccessibilityScore,
  auditPageAccessibility,
} from '../src/lib/accessibility/axe-scanner.ts';
import {
  parseCssColor,
  calculateContrastRatio,
  evaluateTextContrast,
  auditElementsContrast,
} from '../src/lib/accessibility/contrast-analyzer.ts';
import {
  auditElementKeyboardAccessibility,
  evaluateKeyboardNavigation,
} from '../src/lib/accessibility/keyboard-nav.ts';

console.log('================================================================');
console.log(' PROOFix Master Accessibility Auditing CI Regression Suite      ');
console.log(' Feature: Contributions 94–95                                   ');
console.log('================================================================\n');

async function runMasterAccessibilitySuite() {
  // ---------------------------------------------------------
  // Test 1: Automated Accessibility Engine & Rule Violations (C94)
  // ---------------------------------------------------------
  console.log('Test 1: axe-core Rule Scoring & WCAG 2.1 AA Violations...');
  const sampleViolations = [
    {
      id: 'image-alt',
      impact: 'critical',
      tags: ['wcag2a', 'wcag111'],
      description: 'Images must have alternate text',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
      nodes: [{ html: '<img src="avatar.jpg">', target: ['img.avatar'], failureSummary: 'Missing alt' }],
    },
    {
      id: 'button-name',
      impact: 'critical',
      tags: ['wcag2a', 'wcag412'],
      description: 'Buttons must have discernible text',
      help: 'Buttons must have discernible text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/button-name',
      nodes: [{ html: '<button class="close"></button>', target: ['button.close'], failureSummary: 'Empty button' }],
    },
  ];

  const scoreResult = calculateAccessibilityScore(sampleViolations);
  assert.equal(scoreResult.rating, 'non-compliant');
  assert.ok(scoreResult.score < 60);
  console.log('  -> [PASS] Critical accessibility rule violations correctly penalized.\n');

  // ---------------------------------------------------------
  // Test 2: In-Page DOM Accessibility Evaluation & Crash Resilience (C94)
  // ---------------------------------------------------------
  console.log('Test 2: Page Accessibility Evaluation & Crash Resilience...');
  const mockPage = {
    url: () => 'https://app.proofix.dev/checkout',
    evaluate: async () => ({
      violations: [
        {
          id: 'label',
          impact: 'critical',
          tags: ['wcag2a', 'wcag131'],
          description: 'Form elements must have labels',
          help: 'Form elements must have labels',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
          nodes: [{ html: '<input id="card">', target: ['#card'], failureSummary: 'Missing label' }],
        },
      ],
      passesCount: 20,
    }),
  };

  const audit = await auditPageAccessibility(mockPage);
  assert.equal(audit.url, 'https://app.proofix.dev/checkout');
  assert.equal(audit.violationsCount, 1);
  assert.equal(audit.passesCount, 20);

  // Unhandled crash resilience
  const crashingPage = {
    url: () => 'https://app.proofix.dev/error',
    evaluate: async () => {
      throw new Error('Target closed');
    },
  };
  const fallback = await auditPageAccessibility(crashingPage);
  assert.equal(fallback.violations.length, 0);
  assert.ok(fallback.score > 0);
  console.log('  -> [PASS] Page accessibility scanned and crashing sessions safely handled.\n');

  // ---------------------------------------------------------
  // Test 3: WCAG 2.1 AA Color Contrast Engine (C95)
  // ---------------------------------------------------------
  console.log('Test 3: Relative Luminance & Contrast Ratios...');
  const contrastCheckNormal = evaluateTextContrast('#1e293b', '#ffffff', 16, false);
  assert.equal(contrastCheckNormal.passes, true);
  assert.ok(contrastCheckNormal.contrastRatio >= 4.5);

  const contrastCheckFail = evaluateTextContrast('#cbd5e1', '#ffffff', 14, false);
  assert.equal(contrastCheckFail.passes, false);
  assert.ok(contrastCheckFail.contrastRatio < 4.5);

  const largeTextPass = evaluateTextContrast('#64748b', '#ffffff', 20, true);
  assert.equal(largeTextPass.requiredRatio, 3.0);
  assert.equal(largeTextPass.passes, true);
  console.log('  -> [PASS] WCAG color contrast ratios verified for standard and large text.\n');

  // ---------------------------------------------------------
  // Test 4: Keyboard Navigation & Focus Trap Detection (C95)
  // ---------------------------------------------------------
  console.log('Test 4: Keyboard Navigation, Tab Reachability & Focus Traps...');
  const elements = [
    {
      tagName: 'a',
      selector: '#skip-link',
      isFocusable: true,
      tabIndex: 0,
      hasClickAction: true,
      hasKeyboardHandler: true,
      outlineStyle: '2px solid blue',
      boxShadow: 'none',
    },
    {
      tagName: 'button',
      selector: '#submit-btn',
      isFocusable: true,
      tabIndex: 0,
      hasClickAction: true,
      hasKeyboardHandler: true,
      outlineStyle: 'none',
      boxShadow: '0 0 0 2px purple',
    },
  ];

  const navReport = evaluateKeyboardNavigation(elements, { hasSkipLink: true, focusTrapDetected: false });
  assert.equal(navReport.passed, true);
  assert.equal(navReport.hasSkipLink, true);
  assert.equal(navReport.focusTrapDetected, false);

  const badElements = [
    {
      tagName: 'div',
      selector: 'div.fake-btn',
      isFocusable: false, // Clickable div without tabindex
      tabIndex: -1,
      hasClickAction: true,
      hasKeyboardHandler: false,
      outlineStyle: 'none',
      boxShadow: 'none',
    },
  ];
  const badNavReport = evaluateKeyboardNavigation(badElements, { hasSkipLink: false, focusTrapDetected: false });
  assert.equal(badNavReport.passed, false);
  assert.equal(badNavReport.unfocusableClickablesCount, 1);
  console.log('  -> [PASS] Keyboard focus, outlines, and interactive accessibility verified.\n');

  console.log('================================================================');
  console.log(' [ALL PASS] All Accessibility Auditing Contributions Verified!  ');
  console.log(' Contributions 94–95 Completed, Hardened & Tested Successfully.');
  console.log('================================================================');
}

runMasterAccessibilitySuite().catch((err) => {
  console.error('[FAIL] Master accessibility test suite error:', err);
  process.exit(1);
});
