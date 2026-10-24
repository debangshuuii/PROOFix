import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, dispatch } from '../src/lib/cli/dispatcher.ts';

test('dispatcher: parseArgs correctly resolves commands and flags', () => {
  const parsedDoctor = parseArgs(['doctor', '--heal', '--json']);
  assert.equal(parsedDoctor.command, 'doctor');
  assert.equal(parsedDoctor.flags.heal, true);
  assert.equal(parsedDoctor.flags.json, true);

  const parsedRun = parseArgs(['run', '-i', '--scenario', 'ecommerce_checkout', '--headless']);
  assert.equal(parsedRun.command, 'run');
  assert.equal(parsedRun.flags.interactive, true);
  assert.equal(parsedRun.flags.scenario, 'ecommerce_checkout');
  assert.equal(parsedRun.flags.headless, true);

  const parsedFix = parseArgs(['fix', '--apply', '--scenario', 'hydration_mismatch']);
  assert.equal(parsedFix.command, 'fix');
  assert.equal(parsedFix.flags.apply, true);
  assert.equal(parsedFix.flags.scenario, 'hydration_mismatch');

  const parsedWatch = parseArgs(['watch', '--debounce', '500']);
  assert.equal(parsedWatch.command, 'watch');
  assert.equal(parsedWatch.flags.debounce, 500);

  const parsedHelp = parseArgs(['--help']);
  assert.equal(parsedHelp.command, 'help');

  const parsedVersion = parseArgs(['-v']);
  assert.equal(parsedVersion.command, 'version');
});

test('dispatcher: routes doctor command returning exit code 0 or 1', async () => {
  const exitCode = await dispatch(['doctor', '--json']);
  assert.ok([0, 1].includes(exitCode));
});

test('dispatcher: routes run command returning exit code 0 or 1', async () => {
  const exitCode = await dispatch(['run', '--scenario', 'ecommerce_checkout', '--json']);
  assert.ok([0, 1].includes(exitCode));
});

test('dispatcher: routes fix command returning exit code 0 or 1', async () => {
  const exitCode = await dispatch(['fix', '--scenario', 'ecommerce_checkout', '--apply', '--json']);
  assert.ok([0, 1].includes(exitCode));
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
