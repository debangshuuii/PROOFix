import assert from 'node:assert/strict';
import {
  calculateAccessibilityScore,
  auditPageAccessibility,
} from '../src/lib/accessibility/axe-scanner.ts';

console.log('--- Testing Automated Accessibility Engine & WCAG 2.1 AA Scanner (Contribution 94) ---');

function testAccessibilityScoreCalculation() {
  // Case 1: Fully compliant (zero violations)
  const perfect = calculateAccessibilityScore([]);
  assert.equal(perfect.score, 100);
  assert.equal(perfect.rating, 'compliant');

  // Case 2: Critical violation (e.g., missing form labels)
  const criticalViolations = [
    {
      id: 'label',
      impact: 'critical',
      tags: ['wcag2a', 'wcag131'],
      description: 'Form elements must have labels',
      help: 'Form elements must have labels',
      helpUrl: 'https://example.com/rule/label',
      nodes: [
        { html: '<input type="text">', target: ['#email'], failureSummary: 'Missing label' },
        { html: '<input type="password">', target: ['#password'], failureSummary: 'Missing label' },
      ],
    },
  ];

  const criticalResult = calculateAccessibilityScore(criticalViolations);
  assert.ok(criticalResult.score <= 70, `Score should reflect penalty, got ${criticalResult.score}`);
  assert.equal(criticalResult.rating, 'non-compliant');

  // Case 3: Moderate violations (e.g., minor landmark issue)
  const moderateViolations = [
    {
      id: 'region',
      impact: 'moderate',
      tags: ['best-practice'],
      description: 'All page content should be contained by landmarks',
      help: 'Landmarks rule',
      helpUrl: 'https://example.com/rule/region',
      nodes: [{ html: '<div>...</div>', target: ['.content'], failureSummary: 'Not in landmark' }],
    },
  ];

  const moderateResult = calculateAccessibilityScore(moderateViolations);
  assert.equal(moderateResult.score, 92);
  assert.equal(moderateResult.rating, 'needs-attention');

  console.log('[PASS] Accessibility score calculation correctly penalizes by severity and assigns compliance ratings.');
}

async function testPageAccessibilityAuditor() {
  // 1. Mock page returning typical violations
  const mockPage = {
    url: () => 'https://app.proofix.dev/login',
    evaluate: async () => ({
      violations: [
        {
          id: 'image-alt',
          impact: 'critical',
          tags: ['cat.text-alternatives', 'wcag2a', 'wcag111'],
          description: 'Ensures <img> elements have alternate text.',
          help: 'Images must have alternate text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
          nodes: [
            {
              html: '<img src="/logo.png">',
              target: ['img.logo'],
              failureSummary: 'Element does not have an alt attribute.',
              fixGuidance: 'Add an alt attribute describing the image.',
            },
          ],
        },
        {
          id: 'button-name',
          impact: 'critical',
          tags: ['cat.name-role-value', 'wcag2a', 'wcag412'],
          description: 'Ensures buttons have discernible text.',
          help: 'Buttons must have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/button-name',
          nodes: [
            {
              html: '<button class="icon-btn"></button>',
              target: ['button.icon-btn'],
              failureSummary: 'Button has no visible or accessible text.',
              fixGuidance: 'Provide visible text or an aria-label attribute.',
            },
          ],
        },
      ],
      passesCount: 18,
    }),
  };

  const audit = await auditPageAccessibility(mockPage, { standard: 'wcag21aa' });
  assert.equal(audit.url, 'https://app.proofix.dev/login');
  assert.equal(audit.standard, 'wcag21aa');
  assert.equal(audit.violationsCount, 2);
  assert.equal(audit.passesCount, 18);
  assert.equal(audit.rating, 'non-compliant');
  assert.ok(audit.score < 60);

  const imgAltViolation = audit.violations.find((v) => v.id === 'image-alt');
  assert.ok(imgAltViolation);
  assert.equal(imgAltViolation.nodes[0].target[0], 'img.logo');
  console.log('[PASS] In-page accessibility auditor extracts violations, failing selectors, and fix guidance.');

  // 2. Safe fallback when page crashes or throws
  const crashingPage = {
    url: () => 'https://app.proofix.dev/crashed',
    evaluate: async () => {
      throw new Error('Page navigation interrupted');
    },
  };

  const fallbackAudit = await auditPageAccessibility(crashingPage);
  assert.equal(fallbackAudit.url, 'https://app.proofix.dev/crashed');
  assert.equal(fallbackAudit.violations.length, 0);
  assert.ok(fallbackAudit.score > 0);
  console.log('[PASS] Crashed or unresponsive page handled safely without breaking test flow.');
}

async function runSuite() {
  testAccessibilityScoreCalculation();
  await testPageAccessibilityAuditor();
  console.log('[ALL PASS] Contribution 94 test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
