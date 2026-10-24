import test from 'node:test';
import assert from 'node:assert/strict';
import { executeFixCommand } from '../src/lib/cli/commands/fix.ts';

test('fix-command: applies patch in json mode when --apply is set', async () => {
  const result = await executeFixCommand({
    scenario: 'ecommerce_checkout',
    apply: true,
    json: true,
  });

  assert.ok(result);
  assert.equal(result.success, true);
  assert.ok(result.targetFile.includes('checkout') || result.targetFile.includes('CheckoutForm'));
  assert.ok(result.backupPath?.includes('.proofix.bak'));
});

test('fix-command: rolls back previously applied patch', async () => {
  const rollbackResult = await executeFixCommand({
    scenario: 'ecommerce_checkout',
    rollback: true,
    json: true,
  });

  assert.ok(rollbackResult);
  assert.equal(rollbackResult.success, true);
  assert.ok(rollbackResult.message.includes('Restored original'));
});

test('fix-command: returns error for non-existent scenario', async () => {
  const result = await executeFixCommand({
    scenario: 'non_existent_xyz',
    apply: true,
    json: true,
  });

  assert.equal(result.success, false);
  assert.ok(result.message.includes('No active fix proposal found'));
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
