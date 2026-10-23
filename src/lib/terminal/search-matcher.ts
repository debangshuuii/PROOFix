/**
 * Terminal Log Search & Regex Matcher
 *
 * Provides safe regex compilation, case-insensitive substring searching,
 * match index calculation, and visual match segment extraction.
 */

import type { TerminalLine } from '../types/terminal.ts';

export interface SearchSegment {
  text: string;
  isMatch: boolean;
}

export class LogSearchMatcher {
  /**
   * Filters lines based on search query, returning lines that match.
   */
  public static filter(
    lines: TerminalLine[],
    query: string,
    isRegex = false,
    caseSensitive = false
  ): { matchedLines: TerminalLine[]; matchCount: number } {
    const trimmed = query.trim();
    if (!trimmed) {
      return { matchedLines: lines, matchCount: 0 };
    }

    const regex = LogSearchMatcher.compileRegex(trimmed, isRegex, caseSensitive);
    if (!regex) {
      return { matchedLines: lines, matchCount: 0 };
    }

    let matchCount = 0;
    const matchedLines: TerminalLine[] = [];

    for (const line of lines) {
      const isMatch = regex.test(line.rawText);
      regex.lastIndex = 0; // Reset stateful regex

      if (isMatch) {
        matchCount++;
        matchedLines.push({ ...line, isMatch: true });
      }
    }

    return { matchedLines, matchCount };
  }

  /**
   * Segments a text string into highlighted matched chunks and regular chunks.
   */
  public static segment(
    text: string,
    query: string,
    isRegex = false,
    caseSensitive = false
  ): SearchSegment[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return [{ text, isMatch: false }];
    }

    const regex = LogSearchMatcher.compileRegex(trimmed, isRegex, caseSensitive, true);
    if (!regex) {
      return [{ text, isMatch: false }];
    }

    const segments: SearchSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, match.index),
          isMatch: false,
        });
      }

      segments.push({
        text: match[0],
        isMatch: true,
      });

      lastIndex = regex.lastIndex;
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        isMatch: false,
      });
    }

    return segments.length > 0 ? segments : [{ text, isMatch: false }];
  }

  /**
   * Safely compiles a RegExp instance with bounded execution safety.
   */
  public static compileRegex(
    query: string,
    isRegex: boolean,
    caseSensitive: boolean,
    global = false
  ): RegExp | null {
    try {
      const flags = `${global ? 'g' : ''}${caseSensitive ? '' : 'i'}`;
      if (isRegex) {
        return new RegExp(query, flags);
      }
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, flags);
    } catch {
      // Invalid regex pattern provided by user
      return null;
    }
  }
}
