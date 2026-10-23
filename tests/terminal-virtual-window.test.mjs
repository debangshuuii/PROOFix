/**
 * Test Suite: Virtual Windowing & Search Matcher
 *
 * Verifies viewport index slicing, overscan bounding,
 * regex query compilation, and visual text segmentation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualWindow } from '../src/lib/terminal/virtual-window.ts';
import { LogSearchMatcher } from '../src/lib/terminal/search-matcher.ts';

describe('Virtual Windowing & Regex Search Matcher', () => {
  test('should calculate virtual window metrics at top of container', () => {
    const lineHeight = 20;
    const viewportHeight = 400; // 20 lines visible
    const totalLines = 1000;
    const overscan = 5;

    const metrics = VirtualWindow.calculate(0, viewportHeight, totalLines, lineHeight, overscan);

    assert.equal(metrics.totalLines, 1000);
    assert.equal(metrics.lineHeightPx, 20);
    assert.equal(metrics.viewportHeightPx, 400);
    assert.equal(metrics.startIndex, 0); // clamped at 0
    assert.equal(metrics.endIndex, 25); // 20 visible + 5 overscan
    assert.equal(metrics.offsetYPx, 0);
  });

  test('should calculate window metrics when scrolled halfway through container', () => {
    const lineHeight = 20;
    const viewportHeight = 400; // 20 lines visible
    const totalLines = 1000;
    const overscan = 5;

    // Scroll to 2000px = line 100
    const metrics = VirtualWindow.calculate(2000, viewportHeight, totalLines, lineHeight, overscan);

    assert.equal(metrics.startIndex, 95); // 100 - 5 overscan
    assert.equal(metrics.endIndex, 125); // 100 + 20 visible + 5 overscan
    assert.equal(metrics.offsetYPx, 95 * 20); // 1900px
  });

  test('should filter terminal lines with plain text and regex matchers', () => {
    const sampleLines = [
      { id: '1', lineNumber: 1, rawText: '[INFO] Server started on port 8080', tokens: [], level: 'INFO' },
      { id: '2', lineNumber: 2, rawText: '[ERROR] Failed to bind port 8080', tokens: [], level: 'ERROR' },
      { id: '3', lineNumber: 3, rawText: '[DEBUG] Cleanup worker finished', tokens: [], level: 'DEBUG' },
    ];

    // Plain text search
    const { matchedLines: portMatches } = LogSearchMatcher.filter(sampleLines, 'port 8080');
    assert.equal(portMatches.length, 2);

    // Regex search
    const { matchedLines: regexMatches } = LogSearchMatcher.filter(sampleLines, 'port \\d+', true);
    assert.equal(regexMatches.length, 2);

    // Filter non-matching
    const { matchedLines: noMatches } = LogSearchMatcher.filter(sampleLines, 'nonexistent');
    assert.equal(noMatches.length, 0);
  });

  test('should segment text string for visual highlighting of search matches', () => {
    const text = 'Execution timeout 5000ms in Playwright';
    const query = 'timeout';

    const segments = LogSearchMatcher.segment(text, query);

    assert.equal(segments.length, 3);
    assert.equal(segments[0].text, 'Execution ');
    assert.equal(segments[0].isMatch, false);

    assert.equal(segments[1].text, 'timeout');
    assert.equal(segments[1].isMatch, true);

    assert.equal(segments[2].text, ' 5000ms in Playwright');
    assert.equal(segments[2].isMatch, false);
  });
});
