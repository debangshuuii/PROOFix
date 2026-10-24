import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPlaywrightChromium } from '../src/lib/cli/doctor/playwright-check.ts';

test('playwright-check: mock verified binary returns passed status', async () => {
  const res = await checkPlaywrightChromium({
    hasExecutable: true,
    executablePath: '/usr/bin/chromium'
  });
  assert.equal(res.id, 'playwright_chromium');
  assert.equal(res.category, 'browser');
  assert.equal(res.status, 'passed');
  assert.ok(res.message.includes('/usr/bin/chromium'));
});

test('playwright-check: mock missing binary returns warning status with autoFix flag', async () => {
  const res = await checkPlaywrightChromium({
    hasExecutable: false
  });
  assert.equal(res.status, 'warning');
  assert.equal(res.autoFixAvailable, true);
  assert.ok(res.recommendation?.includes('npx playwright install chromium'));
});

test('playwright-check: handles unexpected errors gracefully', async () => {
  const res = await checkPlaywrightChromium({
    error: 'EACCES: permission denied'
  });
  assert.equal(res.status, 'failed');
  assert.ok(res.message.includes('EACCES'));
  assert.equal(res.autoFixAvailable, true);
});

test('playwright-check: live check completes without unhandled rejections', async () => {
  const res = await checkPlaywrightChromium();
  assert.ok(['passed', 'warning'].includes(res.status));
});
