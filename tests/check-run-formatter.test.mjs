import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CheckRunFormatter,
  globalCheckRunFormatter,
} from '../src/lib/integrations/check-run-formatter.ts';

test('CheckRunFormatter generates passing check run with metrics', () => {
  const result = {
    suiteName: 'Checkout Flow E2E',
    totalTests: 10,
    passedCount: 10,
    failedCount: 0,
    skippedCount: 0,
    durationMs: 4200,
    commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    branch: 'main',
    performanceBudget: {
      lcpMs: 1200,
      cls: 0.02,
      memoryMb: 180,
      budgetExceeded: false,
    },
  };

  const payload = globalCheckRunFormatter.formatCheckRun(result);

  assert.equal(payload.name, 'PROOFix / Checkout Flow E2E');
  assert.equal(payload.headSha, result.commitSha);
  assert.equal(payload.status, 'completed');
  assert.equal(payload.conclusion, 'success');
  assert.ok(payload.output.title.includes('Passed'));
  assert.ok(payload.output.summary.includes('100%'));
  assert.ok(payload.output.summary.includes('Optimal'));
  assert.equal(payload.output.annotationsCount, 0);
  assert.equal(payload.output.images, undefined);
});

test('CheckRunFormatter generates failing check run with screenshots and diffs', () => {
  const result = {
    suiteName: 'Billing Portal',
    totalTests: 5,
    passedCount: 4,
    failedCount: 1,
    skippedCount: 0,
    durationMs: 7800,
    commitSha: '9876543210fedcba9876543210fedcba98765432',
    branch: 'fix/invoice-download',
    performanceBudget: {
      lcpMs: 3100,
      cls: 0.15,
      memoryMb: 580,
      budgetExceeded: true,
    },
    failures: [
      {
        testId: 'test-billing-01',
        title: 'Invoice PDF Download Button renders',
        filePath: 'tests/billing.spec.ts',
        line: 48,
        errorMessage: 'Timed out waiting for selector [data-testid="download-pdf"]',
        stackTrace: 'Error: Timed out waiting at BillingPage.downloadPdf (billing.spec.ts:48)',
        screenshotUrl: 'https://proofix.dev/artifacts/screenshots/billing-fail.png',
        diffSnippet: '- <button data-testid="download-pdf">\n+ <div class="spinner">',
      },
    ],
  };

  const formatter = new CheckRunFormatter();
  const payload = formatter.formatCheckRun(result);

  assert.equal(payload.conclusion, 'failure');
  assert.ok(payload.output.title.includes('Failed (1 failed'));
  assert.ok(payload.output.summary.includes('⚠️ Exceeded'));
  assert.ok(payload.output.text?.includes('tests/billing.spec.ts:48'));
  assert.ok(payload.output.text?.includes('Timed out waiting for selector'));
  assert.ok(payload.output.text?.includes('Expected vs Actual Diff:'));
  assert.equal(payload.output.annotationsCount, 1);
  assert.equal(payload.output.images?.length, 1);
  assert.equal(payload.output.images[0].imageUrl, 'https://proofix.dev/artifacts/screenshots/billing-fail.png');
});
