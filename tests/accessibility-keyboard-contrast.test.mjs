import assert from 'node:assert/strict';
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

console.log('--- Testing Keyboard Navigation & Color Contrast Auditing (Contribution 95) ---');

function testContrastAnalysis() {
  // 1. Color Parsing
  const white = parseCssColor('#ffffff');
  assert.equal(white.r, 255);
  assert.equal(white.g, 255);
  assert.equal(white.b, 255);

  const black = parseCssColor('#000000');
  assert.equal(black.r, 0);
  assert.equal(black.g, 0);
  assert.equal(black.b, 0);

  const rgbSample = parseCssColor('rgb(50, 100, 150)');
  assert.equal(rgbSample.r, 50);
  assert.equal(rgbSample.g, 100);
  assert.equal(rgbSample.b, 150);

  // 2. Contrast Ratio calculation (Black on White should be 21:1)
  const maxContrast = calculateContrastRatio(black, white);
  assert.equal(maxContrast, 21);

  const minContrast = calculateContrastRatio(white, white);
  assert.equal(minContrast, 1);

  // 3. WCAG Threshold Evaluation:
  // Dark text on white: passes 4.5:1
  const goodContrast = evaluateTextContrast('#111827', '#ffffff', 16, false);
  assert.equal(goodContrast.passes, true);
  assert.ok(goodContrast.contrastRatio >= 4.5);

  // Low contrast gray on white: fails 4.5:1
  const badContrast = evaluateTextContrast('#9ca3af', '#ffffff', 14, false);
  assert.equal(badContrast.passes, false);
  assert.ok(badContrast.contrastRatio < 4.5);

  // Large bold text threshold (requires only 3.0:1)
  const largeBoldText = evaluateTextContrast('#6b7280', '#ffffff', 20, true);
  assert.equal(largeBoldText.requiredRatio, 3.0);
  assert.equal(largeBoldText.passes, true);

  // 4. Batch Elements Audit
  const batchResult = auditElementsContrast([
    { selector: 'h1', textSnippet: 'Title', textColor: '#111827', backgroundColor: '#ffffff', fontSizePx: 24, isBold: true },
    { selector: 'p.muted', textSnippet: 'Muted', textColor: '#d1d5db', backgroundColor: '#ffffff', fontSizePx: 12, isBold: false },
  ]);
  assert.equal(batchResult.passed, false);
  assert.equal(batchResult.failingCount, 1);
  assert.equal(batchResult.items.length, 2);

  console.log('[PASS] WCAG 2.1 AA color contrast calculation and threshold evaluation verified.');
}

function testKeyboardNavAuditing() {
  // 1. Single element checks
  // Clickable div without tabindex
  const badDiv = auditElementKeyboardAccessibility({
    tagName: 'div',
    selector: 'div.custom-btn',
    isFocusable: false,
    tabIndex: -1,
    hasClickAction: true,
    hasKeyboardHandler: false,
    outlineStyle: 'none',
    boxShadow: 'none',
  });
  assert.ok(badDiv.issues.some((i) => i.includes('not reachable via Tab')));
  assert.ok(badDiv.issues.some((i) => i.includes('does not support Enter or Space')));

  // Focusable button removing outline without replacement
  const badButton = auditElementKeyboardAccessibility({
    tagName: 'button',
    selector: 'button.no-outline',
    isFocusable: true,
    tabIndex: 0,
    hasClickAction: true,
    hasKeyboardHandler: true,
    outlineStyle: 'none',
    boxShadow: 'none',
  });
  assert.ok(badButton.issues.some((i) => i.includes('removes focus outline')));

  // 2. Full Page Keyboard Evaluation
  const elements = [
    {
      tagName: 'a',
      selector: 'a.nav-link',
      isFocusable: true,
      tabIndex: 0,
      hasClickAction: true,
      hasKeyboardHandler: true,
      outlineStyle: '2px solid skyblue',
      boxShadow: 'none',
    },
    {
      tagName: 'button',
      selector: 'button.submit',
      isFocusable: true,
      tabIndex: 0,
      hasClickAction: true,
      hasKeyboardHandler: true,
      outlineStyle: 'none',
      boxShadow: '0 0 0 2px indigo',
    },
  ];

  // Passing navigation run (with skip link and no focus traps)
  const cleanNavReport = evaluateKeyboardNavigation(elements, { hasSkipLink: true, focusTrapDetected: false });
  assert.equal(cleanNavReport.passed, true);
  assert.equal(cleanNavReport.unfocusableClickablesCount, 0);
  assert.equal(cleanNavReport.missingFocusIndicatorsCount, 0);
  assert.equal(cleanNavReport.hasSkipLink, true);

  // Failing navigation run (focus trap detected)
  const trapNavReport = evaluateKeyboardNavigation(elements, { hasSkipLink: true, focusTrapDetected: true });
  assert.equal(trapNavReport.passed, false);
  assert.ok(trapNavReport.issues.some((i) => i.includes('focus trap')));

  console.log('[PASS] Keyboard navigation reachability, focus outlines, and focus trap safety verified.');
}

function runSuite() {
  testContrastAnalysis();
  testKeyboardNavAuditing();
  console.log('[ALL PASS] Contribution 95 test suite passed.');
}

runSuite();
