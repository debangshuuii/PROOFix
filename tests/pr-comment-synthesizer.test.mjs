import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PrCommentSynthesizer,
  globalPrCommentSynthesizer,
} from '../src/lib/integrations/pr-comment-synthesizer.ts';

test('formatUnifiedDiff formats unified diff correctly', () => {
  const synth = new PrCommentSynthesizer();
  const diff = synth.formatUnifiedDiff(
    'src/components/CheckoutButton.tsx',
    'await page.click("button.btn-primary");',
    'await page.click("button[data-testid=\'checkout-btn\']");'
  );

  assert.ok(diff.includes('--- a/src/components/CheckoutButton.tsx'));
  assert.ok(diff.includes('+++ b/src/components/CheckoutButton.tsx'));
  assert.ok(diff.includes('-await page.click("button.btn-primary");'));
  assert.ok(diff.includes('+await page.click("button[data-testid=\'checkout-btn\']");'));
});

test('generate1ClickHealUrl creates valid trigger query', () => {
  const synth = new PrCommentSynthesizer();
  const url = synth.generate1ClickHealUrl(
    'https://proofix.dev',
    'acme/proofix',
    105,
    'abcdef1234567890',
    'Checkout Payment Step'
  );

  assert.ok(url.startsWith('https://proofix.dev/integrations/git/heal?'));
  assert.ok(url.includes('repo=acme%2Fproofix'));
  assert.ok(url.includes('pr=105'));
  assert.ok(url.includes('sha=abcdef123456'));
});

test('synthesizeComment formats self-healing PR comment with diff and link', () => {
  const comment = globalPrCommentSynthesizer.synthesizeComment({
    pullRequestNumber: 105,
    commitSha: 'abcdef1234567890',
    repoFullName: 'acme/proofix',
    testTitle: 'Checkout Flow',
    filePath: 'tests/checkout.spec.ts',
    brokenSelector: 'button.checkout',
    suggestedSelector: 'button[data-testid="pay-now"]',
    originalSnippet: 'await page.click("button.checkout");',
    healedSnippet: 'await page.click("button[data-testid=\\"pay-now\\"]");',
    explanation: 'Class selector was renamed during CSS module migration.',
    healingConfidence: 0.96,
    verificationPassed: false,
    appBaseUrl: 'https://proofix.dev',
  });

  assert.equal(comment.pullRequestNumber, 105);
  assert.equal(comment.commitSha, 'abcdef1234567890');
  assert.equal(comment.verificationPassed, false);
  assert.ok(comment.body.includes('96%'));
  assert.ok(comment.body.includes('button.checkout'));
  assert.ok(comment.body.includes('button[data-testid="pay-now"]'));
  assert.ok(comment.body.includes('1-Click Apply Self-Healing Patch'));
  assert.ok(comment.patchDiff);
});

test('synthesizeComment handles passing status', () => {
  const comment = globalPrCommentSynthesizer.synthesizeComment({
    pullRequestNumber: 105,
    commitSha: 'abcdef1234567890',
    repoFullName: 'acme/proofix',
    testTitle: 'Checkout Flow',
    filePath: 'tests/checkout.spec.ts',
    explanation: 'No regressions.',
    healingConfidence: 1.0,
    verificationPassed: true,
  });

  assert.equal(comment.verificationPassed, true);
  assert.ok(comment.body.includes('Verification Passed'));
  assert.equal(comment.patchDiff, undefined);
});
