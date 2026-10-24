import test from 'node:test';
import assert from 'node:assert/strict';
import { isInteractive, promptChoice, promptConfirm, promptInput } from '../src/lib/cli/prompts.ts';

test('prompts: isInteractive detects non-interactive CI environments', () => {
  const result = isInteractive();
  assert.equal(typeof result, 'boolean');
});

test('prompts: promptChoice returns default choice in non-interactive environment', async () => {
  const choice = await promptChoice('Apply patch?', ['y', 'n', 'diff'], 'n');
  assert.equal(choice, 'n');
});

test('prompts: promptConfirm returns default value in non-interactive environment', async () => {
  const resDefaultFalse = await promptConfirm('Proceed?', false);
  assert.equal(resDefaultFalse, false);

  const resDefaultTrue = await promptConfirm('Proceed?', true);
  assert.equal(resDefaultTrue, true);
});

test('prompts: promptInput returns default value in non-interactive mode', async () => {
  const val = await promptInput('Enter scenario id', 'ecommerce_checkout');
  assert.equal(val, 'ecommerce_checkout');
});
