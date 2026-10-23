/**
 * Test Suite: Log Level Classifier & Ring Buffer Stream
 *
 * Verifies log classification heuristics, timestamp extraction,
 * circular buffer wrap-around, and level-specific counts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LogLevelClassifier } from '../src/lib/terminal/log-classifier.ts';
import { RingBufferStream } from '../src/lib/terminal/ring-buffer-stream.ts';

describe('Log Level Classifier & Ring Buffer Stream', () => {
  test('should classify log levels based on keywords and patterns', () => {
    assert.equal(LogLevelClassifier.classify('[ERROR] Database connection lost'), 'ERROR');
    assert.equal(LogLevelClassifier.classify('FAIL test/auth.spec.ts: Assertion failed'), 'ERROR');
    assert.equal(LogLevelClassifier.classify('TypeError: Cannot read property "id" of null'), 'ERROR');
    assert.equal(LogLevelClassifier.classify('[WARN] Retrying request in 500ms'), 'WARN');
    assert.equal(LogLevelClassifier.classify('[DEBUG] cgroup memory usage: 142MB'), 'DEBUG');
    assert.equal(LogLevelClassifier.classify('[TRACE] Wire frame 0x4A'), 'TRACE');
    assert.equal(LogLevelClassifier.classify('Server listening on port 3000'), 'INFO');
  });

  test('should extract ISO and clock timestamps from log lines', () => {
    const isoLog = '2026-10-23T11:45:00.123Z [INFO] Application booted';
    assert.equal(LogLevelClassifier.extractTimestamp(isoLog), '2026-10-23T11:45:00.123Z');

    const clockLog = '11:45:00 [DEBUG] Query executing';
    assert.equal(LogLevelClassifier.extractTimestamp(clockLog), '11:45:00');

    const noTimeLog = 'Just a log message without time';
    assert.equal(LogLevelClassifier.extractTimestamp(noTimeLog), undefined);
  });

  test('should enforce circular buffer wrap-around and maintain FIFO order', () => {
    const stream = new RingBufferStream(3); // Small capacity for test

    stream.push('Line 1');
    stream.push('Line 2');
    stream.push('Line 3');

    assert.equal(stream.size, 3);
    assert.equal(stream.totalLines, 3);
    assert.deepEqual(
      stream.toArray().map((l) => l.rawText),
      ['Line 1', 'Line 2', 'Line 3']
    );

    // Push 4th line - drops Line 1
    stream.push('Line 4');
    assert.equal(stream.size, 3);
    assert.equal(stream.totalLines, 4);
    assert.deepEqual(
      stream.toArray().map((l) => l.rawText),
      ['Line 2', 'Line 3', 'Line 4']
    );

    // Push 5th line - drops Line 2
    stream.push('Line 5');
    assert.deepEqual(
      stream.toArray().map((l) => l.rawText),
      ['Line 3', 'Line 4', 'Line 5']
    );
  });

  test('should compute accurate counts grouped by log severity level', () => {
    const stream = new RingBufferStream(10);
    stream.push('[ERROR] Error 1');
    stream.push('[ERROR] Error 2');
    stream.push('[WARN] Warning 1');
    stream.push('[INFO] Info 1');
    stream.push('[DEBUG] Debug 1');

    const counts = stream.getCounts();
    assert.equal(counts.ALL, 5);
    assert.equal(counts.ERROR, 2);
    assert.equal(counts.WARN, 1);
    assert.equal(counts.INFO, 1);
    assert.equal(counts.DEBUG, 1);
    assert.equal(counts.TRACE, 0);
  });
});
