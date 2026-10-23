/**
 * Virtualized Streaming Terminal Contracts
 *
 * Defines data structures for ANSI-styled terminal logs, log-level classifications,
 * virtualized viewport calculations, and auto-scroll control states.
 */

export type LogLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'TRACE';

export interface AnsiToken {
  text: string;
  color?: string; // Hex color or CSS class
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface TerminalLine {
  id: string;
  lineNumber: number;
  rawText: string;
  tokens: AnsiToken[];
  level: LogLevel;
  timestamp?: string;
  isMatch?: boolean;
}

export interface TerminalFilterState {
  level: LogLevel;
  searchQuery: string;
  isRegex: boolean;
  caseSensitive: boolean;
}

export interface VirtualWindowMetrics {
  totalLines: number;
  lineHeightPx: number;
  viewportHeightPx: number;
  startIndex: number;
  endIndex: number;
  offsetYPx: number;
  visibleCount: number;
}

export interface StreamingTerminalProps {
  logs: string[];
  runId: string;
  isRunning?: boolean;
  maxBufferLines?: number;
  initialLogLevel?: LogLevel;
  className?: string;
}
