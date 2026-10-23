/**
 * Test Suite: Streaming Virtualized Terminal End-to-End Integration
 *
 * Verifies end-to-end integration of ANSI parsing, log level categorization,
 * regex search filtering, and virtualized window slicing across large log streams.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RingBufferStream } from '../src/lib/terminal/ring-buffer-stream.ts';
import { VirtualWindow } from '../src/lib/terminal/virtual-window.ts';
import { LogSearchMatcher } from '../src/lib/terminal/search-matcher.ts';
import { AnsiParser } from '../src/lib/terminal/ansi-parser.ts';

describe('Streaming Terminal Virtualization & Processing Integration', () => {
  const generateMockLogStream = (count = 150) => {
    const logs = [];
    for (let i = 1; i <= count; i++) {
      if (i % 25 === 0) {
        logs.push(`\x1b[31m[ERROR]\x1b[0m Failed test assertion step ${i}: expected 200 got 500`);
      } else if (i % 15 === 0) {
        logs.push(`\x1b[33m[WARN]\x1b[0m Memory threshold warning at step ${i}`);
      } else if (i % 5 === 0) {
        logs.push(`\x1b[35m[DEBUG]\x1b[0m Worker sandbox memory metrics ${i * 4}MB`);
      } else {
        logs.push(`\x1b[32m[INFO]\x1b[0m Executing Playwright navigation step ${i}`);
      }
    }
    return logs;
  };

  test('should ingest and classify 150 mixed ANSI stream lines in RingBufferStream', () => {
    const stream = new RingBufferStream(500);
    const mockLogs = generateMockLogStream(150);
    stream.pushBatch(mockLogs);

    assert.equal(stream.totalLines, 150);
    assert.equal(stream.size, 150);

    const counts = stream.getCounts();
    assert.equal(counts.ALL, 150);
    assert.equal(counts.ERROR, 6); // 25, 50, 75, 100, 125, 150
    assert.ok(counts.WARN > 0);
    assert.ok(counts.DEBUG > 0);
    assert.ok(counts.INFO > 0);
  });

  test('should filter stream by level and search query simultaneously', () => {
    const stream = new RingBufferStream(500);
    stream.pushBatch(generateMockLogStream(150));

    // Filter by ERROR level
    const errorLines = stream.getLinesByLevel('ERROR');
    assert.equal(errorLines.length, 6);

    // Apply regex search on error lines
    const { matchedLines } = LogSearchMatcher.filter(errorLines, 'step 1[0-9]+', true);
    // Steps 100, 125, 150 match step 1[0-9]+
    assert.equal(matchedLines.length, 3);
    assert.ok(matchedLines.every((l) => l.level === 'ERROR'));
  });

  test('should compute valid virtual window slices for the filtered stream', () => {
    const stream = new RingBufferStream(500);
    stream.pushBatch(generateMockLogStream(150));

    const infoLines = stream.getLinesByLevel('INFO');
    const viewportHeight = 220; // 10 visible lines at 22px
    const lineHeight = 22;
    const overscan = 4;

    // At top of container
    const topMetrics = VirtualWindow.calculate(0, viewportHeight, infoLines.length, lineHeight, overscan);
    assert.equal(topMetrics.startIndex, 0);
    assert.equal(topMetrics.endIndex, 14); // 10 visible + 4 overscan
    assert.equal(topMetrics.offsetYPx, 0);

    const slice = infoLines.slice(topMetrics.startIndex, topMetrics.endIndex);
    assert.equal(slice.length, 14);

    // First line should have green ANSI token
    const firstLine = slice[0];
    const infoToken = firstLine.tokens.find((t) => t.text.includes('[INFO]'));
    assert.ok(infoToken);
    assert.equal(infoToken.color, '#4ade80');
  });

  test('should export clean plain text stripped of ANSI control sequences', () => {
    const stream = new RingBufferStream(10);
    stream.push('\x1b[1m\x1b[31m[ERROR]\x1b[0m Connection failed\x1b[0m');

    const rawExport = stream.toArray().map((l) => AnsiParser.stripAnsi(l.rawText)).join('\n');
    assert.equal(rawExport, '[ERROR] Connection failed');
    assert.ok(!rawExport.includes('\x1b'));
  });
});
