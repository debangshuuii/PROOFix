import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalSpinner, createSpinner } from '../src/lib/cli/spinner.ts';

test('spinner: creates instance with default configuration', () => {
  const spinner = createSpinner('Validating environment');
  assert.equal(spinner.isRunning(), false);
});

test('spinner: starts and stops cleanly', () => {
  const spinner = new TerminalSpinner({ text: 'Checking Playwright' });
  spinner.start();
  assert.equal(spinner.isRunning(), true);

  spinner.update('Updated status');
  spinner.stop();
  assert.equal(spinner.isRunning(), false);
});

test('spinner: succeed and fail terminate spinning state', () => {
  const s1 = createSpinner('Task 1').start();
  assert.equal(s1.isRunning(), true);
  s1.succeed('Task 1 completed');
  assert.equal(s1.isRunning(), false);

  const s2 = createSpinner('Task 2').start();
  assert.equal(s2.isRunning(), true);
  s2.fail('Task 2 failed');
  assert.equal(s2.isRunning(), false);
});
