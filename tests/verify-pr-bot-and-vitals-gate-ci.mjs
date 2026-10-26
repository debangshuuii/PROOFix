/**
 * Automated Verification Suite for PROOFix Production CI/CD & Turnkey PR Bot
 * Validates Core Web Vitals Gatekeeper, Cryptographic Proof Badge,
 * Side-by-Side Visual Slider, Slash Command Parser, and Rich PR Comment Bot.
 */

import assert from 'node:assert';
import { CoreWebVitalsGatekeeper } from '../src/lib/performance/core-web-vitals-gate.ts';
import { ProofBadgeGenerator } from '../src/lib/prover/proof-badge-generator.ts';
import { VisualSliderGenerator } from '../src/lib/visual/visual-slider-generator.ts';
import { SlashCommandParser } from '../src/lib/integrations/slash-command-parser.ts';
import { CommentCommandHandler } from '../src/lib/integrations/comment-command-handler.ts';
import { RichPrBot } from '../src/lib/integrations/rich-pr-bot.ts';
import { validateActionInputs } from '../src/action/validator.ts';

console.log('====================================================');
console.log('  PROOFix Production CI/CD & PR Bot CI Suite');
console.log('====================================================');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Core Web Vitals Gatekeeper Tests
runTest('Core Web Vitals Gate: Passes on compliant LCP <= 2.5s and CLS <= 0.10', () => {
  const gate = new CoreWebVitalsGatekeeper({ maxLcpMs: 2500, maxClsScore: 0.10 });
  const mockVitals = {
    lcp: { name: 'LCP', label: 'Largest Contentful Paint', value: 1250, unit: 'ms', rating: 'good', thresholds: { good: 2000, poor: 2500 }, description: '' },
    cls: { name: 'CLS', label: 'Cumulative Layout Shift', value: 0.02, unit: 'score', rating: 'good', thresholds: { good: 0.05, poor: 0.10 }, description: '' },
    fcp: { name: 'FCP', label: 'First Contentful Paint', value: 700, unit: 'ms', rating: 'good', thresholds: { good: 1000, poor: 1800 }, description: '' },
    ttfb: { name: 'TTFB', label: 'Time to First Byte', value: 200, unit: 'ms', rating: 'good', thresholds: { good: 600, poor: 800 }, description: '' },
  };

  const result = gate.evaluateVitals(mockVitals);
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.violations.length, 0);
  assert.strictEqual(result.rating, 'good');
});

runTest('Core Web Vitals Gate: Fails when LCP > 2500ms', () => {
  const gate = new CoreWebVitalsGatekeeper({ maxLcpMs: 2500, maxClsScore: 0.10 });
  const mockVitals = {
    lcp: { name: 'LCP', label: 'Largest Contentful Paint', value: 3100, unit: 'ms', rating: 'poor', thresholds: { good: 2000, poor: 2500 }, description: '' },
    cls: { name: 'CLS', label: 'Cumulative Layout Shift', value: 0.02, unit: 'score', rating: 'good', thresholds: { good: 0.05, poor: 0.10 }, description: '' },
    fcp: { name: 'FCP', label: 'First Contentful Paint', value: 700, unit: 'ms', rating: 'good', thresholds: { good: 1000, poor: 1800 }, description: '' },
    ttfb: { name: 'TTFB', label: 'Time to First Byte', value: 200, unit: 'ms', rating: 'good', thresholds: { good: 600, poor: 800 }, description: '' },
  };

  const result = gate.evaluateVitals(mockVitals);
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.violations.length, 1);
  assert.strictEqual(result.violations[0].metric, 'LCP');
});

runTest('Core Web Vitals Gate: Fails when CLS > 0.10', () => {
  const gate = new CoreWebVitalsGatekeeper({ maxLcpMs: 2500, maxClsScore: 0.10 });
  const mockVitals = {
    lcp: { name: 'LCP', label: 'Largest Contentful Paint', value: 1800, unit: 'ms', rating: 'good', thresholds: { good: 2000, poor: 2500 }, description: '' },
    cls: { name: 'CLS', label: 'Cumulative Layout Shift', value: 0.18, unit: 'score', rating: 'poor', thresholds: { good: 0.05, poor: 0.10 }, description: '' },
    fcp: { name: 'FCP', label: 'First Contentful Paint', value: 700, unit: 'ms', rating: 'good', thresholds: { good: 1000, poor: 1800 }, description: '' },
    ttfb: { name: 'TTFB', label: 'Time to First Byte', value: 200, unit: 'ms', rating: 'good', thresholds: { good: 600, poor: 800 }, description: '' },
  };

  const result = gate.evaluateVitals(mockVitals);
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.violations.length, 1);
  assert.strictEqual(result.violations[0].metric, 'CLS');
});

// 2. Cryptographic Proof Badge Tests
runTest('Proof Badge: Generates verifiable SHA-256 fingerprint & HMAC signature', () => {
  const badgeGen = new ProofBadgeGenerator();
  const badge = badgeGen.generateProofBadge({
    commitSha: 'c7a4b891',
    totalChecks: 10,
    passedChecks: 10,
    failedChecks: 0,
    runId: 'run_test_01',
  });

  assert.strictEqual(badge.status, 'VERIFIED');
  assert.strictEqual(badge.zeroRegressionPassRate, 1.0);
  assert.strictEqual(badge.fingerprint.length, 64); // Valid SHA-256 hex
  assert.ok(badgeGen.verifyProofIntegrity(badge.fingerprint, badge.signature));
  assert.strictEqual(badgeGen.verifyProofIntegrity(badge.fingerprint, 'invalid_sig'), false);
});

// 3. Side-by-Side Visual Slider Tests
runTest('Visual Slider: Generates side-by-side comparison with pixel mismatch', () => {
  const sliderGen = new VisualSliderGenerator(0.1);
  const comparison = sliderGen.generateComparison({
    routePath: '/checkout',
    baselineImageUrl: 'https://proofix.dev/baseline.png',
    candidateImageUrl: 'https://proofix.dev/candidate.png',
    diffImageUrl: 'https://proofix.dev/diff.png',
    mismatchPercentage: 0.45,
  });

  assert.strictEqual(comparison.routePath, '/checkout');
  assert.strictEqual(comparison.hasRegression, true);
  assert.strictEqual(comparison.mismatchPercentage, 0.45);
  assert.ok(comparison.sliderHtml.includes('proofix-visual-slider'));

  const markdown = sliderGen.formatMarkdownComparison([comparison]);
  assert.ok(markdown.includes('Baseline (Before)'));
  assert.ok(markdown.includes('🔴 REGRESSION'));
});

// 4. Slash Command Parser Tests
runTest('Slash Command Parser: Correctly parses /proofix fix, prove, and budget', () => {
  const parser = new SlashCommandParser();

  assert.strictEqual(parser.isSlashCommand('/proofix fix'), true);
  assert.strictEqual(parser.isSlashCommand('Just a normal comment'), false);

  const parsedFix = parser.parseComment('/proofix fix --apply', { pullRequestNumber: 42 });
  assert.strictEqual(parsedFix.command, 'fix');
  assert.strictEqual(parsedFix.pullRequestNumber, 42);
  assert.strictEqual(parsedFix.isValid, true);

  const parsedProve = parser.parseComment('/proofix prove');
  assert.strictEqual(parsedProve.command, 'prove');

  const parsedBudget = parser.parseComment('/proofix budget');
  assert.strictEqual(parsedBudget.command, 'budget');
});

// 5. Slash Command Handler Tests
runTest('Comment Command Handler: Processes /proofix fix and generates patch commit', async () => {
  const handler = new CommentCommandHandler();
  const parser = new SlashCommandParser();
  const parsed = parser.parseComment('/proofix fix', { pullRequestNumber: 15 });

  const result = await handler.handleCommand(parsed, {
    repoFullName: 'debangshuuii/PROOFix',
    pullRequestNumber: 15,
    branchName: 'feature/payment',
    headSha: 'f3a91b2c',
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.command, 'fix');
  assert.ok(result.committedPatchSha);
  assert.ok(result.replyCommentBody.includes('PROOFix Self-Healing Patch Applied'));
});

// 6. Rich PR Bot Synthesizer Tests
runTest('Rich PR Bot: Synthesizes complete GitHub review comment', () => {
  const bot = new RichPrBot();
  const badgeGen = new ProofBadgeGenerator();
  const badge = badgeGen.generateProofBadge({
    commitSha: 'a1b2c3d4',
    totalChecks: 8,
    passedChecks: 8,
    failedChecks: 0,
    runId: 'run_pr_01',
  });

  const gate = new CoreWebVitalsGatekeeper();
  const vitals = gate.evaluateVitals({
    lcp: { name: 'LCP', label: 'Largest Contentful Paint', value: 1100, unit: 'ms', rating: 'good', thresholds: { good: 2000, poor: 2500 }, description: '' },
    cls: { name: 'CLS', label: 'Cumulative Layout Shift', value: 0.01, unit: 'score', rating: 'good', thresholds: { good: 0.05, poor: 0.10 }, description: '' },
    fcp: { name: 'FCP', label: 'First Contentful Paint', value: 600, unit: 'ms', rating: 'good', thresholds: { good: 1000, poor: 1800 }, description: '' },
    ttfb: { name: 'TTFB', label: 'Time to First Byte', value: 150, unit: 'ms', rating: 'good', thresholds: { good: 600, poor: 800 }, description: '' },
  });

  const comment = bot.synthesizeComment({
    repoFullName: 'debangshuuii/PROOFix',
    pullRequestNumber: 99,
    commitSha: 'a1b2c3d4',
    runId: 'run_pr_01',
    verificationPassed: true,
    totalChecks: 8,
    passedChecks: 8,
    failedChecks: 0,
    durationMs: 3200,
    proofBadge: badge,
    vitalsGate: vitals,
    visualComparisons: [],
    oneClickApplyUrl: 'https://proofix.dev/integrations/git/heal?pr=99',
  });

  assert.ok(comment.includes('PROOFix Pull Request Quality Gate: 🟢 PASSED'));
  assert.ok(comment.includes('Cryptographic Execution Evidence'));
  assert.ok(comment.includes('Core Web Vitals & Lighthouse Budget Gate'));
  assert.ok(comment.includes('SHA-256'));
});

// 7. Action Validator Tests with Vitals Budgets
runTest('Action Validator: Successfully parses lcp-budget-ms and cls-budget', () => {
  const validation = validateActionInputs({
    'project-path': '.',
    'verification-profile': 'full',
    'lcp-budget-ms': '2200',
    'cls-budget': '0.08',
    'fail-on-vitals-budget': 'true',
  });

  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.inputs.lcpBudgetMs, 2200);
  assert.strictEqual(validation.inputs.clsBudget, 0.08);
  assert.strictEqual(validation.inputs.failOnVitalsBudget, true);
});

console.log('====================================================');
console.log(`  All ${passedTests} PR Bot & Vitals Gate CI Checks Passed!`);
console.log('====================================================');
