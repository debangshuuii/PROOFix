import test from 'node:test';
import assert from 'node:assert/strict';
import { colors, symbols, stripAnsi, badge, supportsColor } from '../src/lib/cli/colors.ts';

test('colors: stripAnsi cleans ANSI escape codes properly', () => {
  const styled = `\x1b[32mHello\x1b[0m \x1b[1mWorld\x1b[0m`;
  assert.equal(stripAnsi(styled), 'Hello World');
});

test('colors: supportsColor returns boolean', () => {
  const result = supportsColor();
  assert.equal(typeof result, 'boolean');
});

test('colors: text styling functions produce non-empty strings', () => {
  const text = 'PROOFix';
  assert.ok(colors.bold(text).includes(text));
  assert.ok(colors.green(text).includes(text));
  assert.ok(colors.red(text).includes(text));
  assert.ok(colors.yellow(text).includes(text));
  assert.ok(colors.cyan(text).includes(text));
  assert.ok(colors.bgGreen(text).includes(text));
});

test('colors: symbols provide expected characters', () => {
  assert.equal(symbols.tick, '✓');
  assert.equal(symbols.cross, '✖');
  assert.equal(symbols.warn, '⚠');
  assert.ok(Array.isArray(symbols.spinner));
  assert.ok(symbols.spinner.length > 5);
});

test('colors: badge creates label with uppercase formatting', () => {
  const passBadge = badge('pass', 'green');
  assert.ok(stripAnsi(passBadge).includes('PASS'));
});
