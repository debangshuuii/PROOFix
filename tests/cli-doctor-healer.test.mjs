import test from 'node:test';
import assert from 'node:assert/strict';
import { autoHealPlaywrightChromium } from '../src/lib/cli/doctor/healer.ts';

test('healer: mock successful installation returns healed check status', async () => {
  const res = await autoHealPlaywrightChromium({
    mockSuccess: true
  });
  assert.equal(res.success, true);
  assert.equal(res.command, 'npx playwright install chromium');
  assert.equal(res.healedCheck?.status, 'healed');
  assert.ok(res.healedCheck?.message.includes('verified'));
});

test('healer: mock error handles network / installation failure gracefully', async () => {
  const res = await autoHealPlaywrightChromium({
    mockError: 'ETIMEDOUT: failed to connect to cdn.playwright.dev'
  });
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('ETIMEDOUT'));
});

test('healer: notifies progress callback when provided', async () => {
  const progressMessages = [];
  await autoHealPlaywrightChromium({
    mockSuccess: true,
    onProgress: (msg) => progressMessages.push(msg)
  });
  assert.ok(progressMessages.length > 0);
  assert.ok(progressMessages[0].includes('playwright install chromium'));
});
