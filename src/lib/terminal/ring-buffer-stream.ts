/**
 * Memory-Bounded Ring Buffer Stream for High-Throughput Terminal Logs
 *
 * Ensures constant-memory usage during streaming run executions with
 * pre-parsed ANSI tokens, log classification, and 1-indexed numbering.
 */

import type { TerminalLine, LogLevel } from '../types/terminal.ts';
import { AnsiParser } from './ansi-parser.ts';
import { LogLevelClassifier } from './log-classifier.ts';

export class RingBufferStream {
  private buffer: TerminalLine[];
  private capacity: number;
  private head = 0;
  private totalIngested = 0;

  constructor(capacity = 10000) {
    this.capacity = capacity;
    this.buffer = [];
  }

  /**
   * Pushes a single raw string line into the stream.
   */
  public push(rawText: string): TerminalLine {
    this.totalIngested++;
    const lineNumber = this.totalIngested;

    const line: TerminalLine = {
      id: `line-${lineNumber}`,
      lineNumber,
      rawText,
      tokens: AnsiParser.parse(rawText),
      level: LogLevelClassifier.classify(rawText),
      timestamp: LogLevelClassifier.extractTimestamp(rawText),
    };

    if (this.buffer.length < this.capacity) {
      this.buffer.push(line);
    } else {
      this.buffer[this.head] = line;
      this.head = (this.head + 1) % this.capacity;
    }

    return line;
  }

  /**
   * Batch ingests multiple lines efficiently.
   */
  public pushBatch(rawLines: string[]): TerminalLine[] {
    return rawLines.map((l) => this.push(l));
  }

  /**
   * Returns all stored lines in chronological order.
   */
  public toArray(): TerminalLine[] {
    if (this.buffer.length < this.capacity) {
      return [...this.buffer];
    }

    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }

  /**
   * Filters lines by log severity level.
   */
  public getLinesByLevel(level: LogLevel): TerminalLine[] {
    const all = this.toArray();
    if (level === 'ALL') return all;
    return all.filter((l) => l.level === level);
  }

  /**
   * Returns count metrics by log level.
   */
  public getCounts(): Record<LogLevel, number> {
    const all = this.toArray();
    const counts: Record<LogLevel, number> = {
      ALL: all.length,
      ERROR: 0,
      WARN: 0,
      INFO: 0,
      DEBUG: 0,
      TRACE: 0,
    };

    for (const line of all) {
      if (counts[line.level] !== undefined) {
        counts[line.level]++;
      }
    }

    return counts;
  }

  public get size(): number {
    return this.buffer.length;
  }

  public get totalLines(): number {
    return this.totalIngested;
  }

  public clear(): void {
    this.buffer = [];
    this.head = 0;
    this.totalIngested = 0;
  }
}
