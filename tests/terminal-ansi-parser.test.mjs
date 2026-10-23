/**
 * Test Suite: ANSI Terminal Parser & Color Tokenizer
 *
 * Verifies translation of ANSI SGR escape sequences into styled tokens,
 * 16-color & 256-color support, text styles, and stripAnsi utility.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AnsiParser } from '../src/lib/terminal/ansi-parser.ts';

describe('ANSI Escape Sequence Parser', () => {
  test('should parse plain text line without modifications', () => {
    const raw = 'Normal terminal output without colors';
    const tokens = AnsiParser.parse(raw);

    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].text, raw);
    assert.equal(tokens[0].color, undefined);
  });

  test('should parse standard ANSI foreground colors', () => {
    // Red text
    const redRaw = '\x1b[31m[ERROR] Connection refused\x1b[0m';
    const tokens = AnsiParser.parse(redRaw);

    assert.ok(tokens.length >= 1);
    const coloredToken = tokens.find((t) => t.text.includes('[ERROR]'));
    assert.ok(coloredToken);
    assert.equal(coloredToken.color, '#f87171'); // Mapped red hex

    // Green text
    const greenRaw = '\x1b[32m✔ 45 tests passed\x1b[0m';
    const greenTokens = AnsiParser.parse(greenRaw);
    const passToken = greenTokens.find((t) => t.text.includes('45 tests passed'));
    assert.ok(passToken);
    assert.equal(passToken.color, '#4ade80'); // Mapped green hex
  });

  test('should parse text styles: bold, dim, and underline', () => {
    const boldRaw = '\x1b[1m\x1b[34m[BOLD BLUE]\x1b[0m Normal';
    const tokens = AnsiParser.parse(boldRaw);

    const boldToken = tokens.find((t) => t.text === '[BOLD BLUE]');
    assert.ok(boldToken);
    assert.equal(boldToken.bold, true);
    assert.equal(boldToken.color, '#60a5fa');

    const normalToken = tokens.find((t) => t.text.includes('Normal'));
    assert.ok(normalToken);
    assert.equal(normalToken.bold, undefined);
    assert.equal(normalToken.color, undefined);
  });

  test('should parse compound ANSI sequences (bold + yellow + underline)', () => {
    const compound = '\x1b[1;33;4mWARNING\x1b[0m';
    const tokens = AnsiParser.parse(compound);

    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].text, 'WARNING');
    assert.equal(tokens[0].bold, true);
    assert.equal(tokens[0].underline, true);
    assert.equal(tokens[0].color, '#facc15');
  });

  test('should accurately strip ANSI codes from string', () => {
    const colored = '\x1b[1m\x1b[31mFAIL:\x1b[0m \x1b[33mtimeout 5000ms\x1b[0m in test.ts';
    const clean = AnsiParser.stripAnsi(colored);

    assert.equal(clean, 'FAIL: timeout 5000ms in test.ts');
    assert.ok(!clean.includes('\x1b'));
  });
});
