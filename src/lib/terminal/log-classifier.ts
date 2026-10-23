/**
 * Log Level Classifier & Timestamp Extractor
 *
 * Inspects stdout/stderr strings, stack traces, and Playwright output
 * to accurately assign log severity levels and timestamps.
 */

import type { LogLevel } from '../types/terminal.ts';
import { AnsiParser } from './ansi-parser.ts';

export class LogLevelClassifier {
  private static TIMESTAMP_ISO_REGEX = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/;
  private static TIMESTAMP_TIME_REGEX = /\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/;

  /**
   * Classifies severity level of a log line.
   */
  public static classify(line: string): LogLevel {
    const clean = AnsiParser.stripAnsi(line).trim();
    if (!clean) return 'INFO';

    const upper = clean.toUpperCase();

    // 1. Errors and Failures
    if (
      upper.includes('[ERROR]') ||
      upper.includes('ERROR:') ||
      upper.includes('[FATAL]') ||
      upper.includes('FAIL') ||
      upper.includes('ASSERTIONERROR') ||
      upper.includes('EXCEPTION') ||
      upper.includes('SYNTAXERROR') ||
      upper.includes('TYPEERROR') ||
      upper.includes('COMMAND FAILED') ||
      upper.includes('TIMEOUT EXCEEDED')
    ) {
      return 'ERROR';
    }

    // 2. Warnings
    if (
      upper.includes('[WARN]') ||
      upper.includes('[WARNING]') ||
      upper.includes('WARNING:') ||
      upper.includes('DEPRECATION') ||
      upper.includes('DEPRECATED')
    ) {
      return 'WARN';
    }

    // 3. Trace
    if (upper.includes('[TRACE]') || upper.includes('TRACE:')) {
      return 'TRACE';
    }

    // 4. Debug
    if (
      upper.includes('[DEBUG]') ||
      upper.includes('DEBUG:') ||
      upper.includes('VERBOSE') ||
      upper.includes('CGROUP') ||
      upper.includes('PID=')
    ) {
      return 'DEBUG';
    }

    // Default: Info
    return 'INFO';
  }

  /**
   * Extracts timestamp from line if present, else returns undefined.
   */
  public static extractTimestamp(line: string): string | undefined {
    const clean = AnsiParser.stripAnsi(line);
    const isoMatch = clean.match(LogLevelClassifier.TIMESTAMP_ISO_REGEX);
    if (isoMatch) return isoMatch[0];

    const timeMatch = clean.match(LogLevelClassifier.TIMESTAMP_TIME_REGEX);
    if (timeMatch) return timeMatch[0];

    return undefined;
  }
}
