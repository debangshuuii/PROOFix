/**
 * Robust ANSI Escape Sequence Parser
 *
 * Converts raw stdout / stderr terminal output containing ANSI SGR escape codes
 * into structured AnsiToken arrays with RGB color values and font weights.
 */

import type { AnsiToken } from '../types/terminal.ts';

const ANSI_COLOR_MAP: Record<number, string> = {
  // Standard foreground
  30: '#1e293b', // Black
  31: '#f87171', // Red
  32: '#4ade80', // Green
  33: '#facc15', // Yellow
  34: '#60a5fa', // Blue
  35: '#c084fc', // Magenta
  36: '#38bdf8', // Cyan
  37: '#f1f5f9', // White

  // Bright foreground
  90: '#94a3b8', // Bright Black (Gray)
  91: '#ef4444', // Bright Red
  92: '#22c55e', // Bright Green
  93: '#eab308', // Bright Yellow
  94: '#3b82f6', // Bright Blue
  95: '#a855f7', // Bright Magenta
  96: '#0ea5e9', // Bright Cyan
  97: '#ffffff', // Bright White
};

const ANSI_BG_COLOR_MAP: Record<number, string> = {
  // Standard background
  40: '#020617', // Black
  41: '#7f1d1d', // Red
  42: '#14532d', // Green
  43: '#713f12', // Yellow
  44: '#1e3a8a', // Blue
  45: '#581c87', // Magenta
  46: '#0c4a6e', // Cyan
  47: '#334155', // White

  // Bright background
  100: '#1e293b',
  101: '#991b1b',
  102: '#166534',
  103: '#854d0e',
  104: '#1e40af',
  105: '#6b21a8',
  106: '#075985',
  107: '#475569',
};

export class AnsiParser {
  private static ANSI_REGEX = /\x1b\[([0-9;]*)m/g;

  /**
   * Parses a raw line containing ANSI escape sequences into structured styled tokens.
   */
  public static parse(rawLine: string): AnsiToken[] {
    if (!rawLine.includes('\x1b[')) {
      return [{ text: rawLine }];
    }

    const tokens: AnsiToken[] = [];
    let currentColor: string | undefined = undefined;
    let currentBgColor: string | undefined = undefined;
    let isBold = false;
    let isDim = false;
    let isItalic = false;
    let isUnderline = false;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    AnsiParser.ANSI_REGEX.lastIndex = 0;

    while ((match = AnsiParser.ANSI_REGEX.exec(rawLine)) !== null) {
      const textChunk = rawLine.slice(lastIndex, match.index);
      if (textChunk.length > 0) {
        tokens.push({
          text: textChunk,
          color: currentColor,
          bgColor: currentBgColor,
          bold: isBold || undefined,
          dim: isDim || undefined,
          italic: isItalic || undefined,
          underline: isUnderline || undefined,
        });
      }

      // Process ANSI codes
      const codes = match[1] ? match[1].split(';').map(Number) : [0];
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];

        if (code === 0) {
          // Reset
          currentColor = undefined;
          currentBgColor = undefined;
          isBold = false;
          isDim = false;
          isItalic = false;
          isUnderline = false;
        } else if (code === 1) {
          isBold = true;
        } else if (code === 2) {
          isDim = true;
        } else if (code === 3) {
          isItalic = true;
        } else if (code === 4) {
          isUnderline = true;
        } else if (code === 22) {
          isBold = false;
          isDim = false;
        } else if (code === 23) {
          isItalic = false;
        } else if (code === 24) {
          isUnderline = false;
        } else if (code === 39) {
          currentColor = undefined;
        } else if (code === 49) {
          currentBgColor = undefined;
        } else if (ANSI_COLOR_MAP[code]) {
          currentColor = ANSI_COLOR_MAP[code];
        } else if (ANSI_BG_COLOR_MAP[code]) {
          currentBgColor = ANSI_BG_COLOR_MAP[code];
        } else if (code === 38 && codes[i + 1] === 5) {
          // 256 colors: 38;5;N
          const colorIndex = codes[i + 2];
          currentColor = AnsiParser.indexToRgb(colorIndex);
          i += 2;
        } else if (code === 48 && codes[i + 1] === 5) {
          // 256 colors bg: 48;5;N
          const colorIndex = codes[i + 2];
          currentBgColor = AnsiParser.indexToRgb(colorIndex);
          i += 2;
        }
      }

      lastIndex = AnsiParser.ANSI_REGEX.lastIndex;
    }

    // Trailing text
    if (lastIndex < rawLine.length) {
      tokens.push({
        text: rawLine.slice(lastIndex),
        color: currentColor,
        bgColor: currentBgColor,
        bold: isBold || undefined,
        dim: isDim || undefined,
        italic: isItalic || undefined,
        underline: isUnderline || undefined,
      });
    }

    return tokens;
  }

  /**
   * Strips all ANSI codes and returns pure plain text.
   */
  public static stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }

  /**
   * Simple 256-color lookup to Hex code.
   */
  private static indexToRgb(n: number): string {
    if (n < 16 && ANSI_COLOR_MAP[n + 30]) {
      return ANSI_COLOR_MAP[n + 30];
    }
    // High spectrum color approximate
    return `hsl(${(n * 23) % 360}, 75%, 60%)`;
  }
}
