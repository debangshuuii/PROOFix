'use client';

/**
 * Terminal Line Gutter Component
 *
 * Renders line numbering, severity dot indicators, and optional timestamps
 * with strict non-selectable styling for seamless log copying.
 */

import React from 'react';
import type { LogLevel } from '@/lib/types/terminal';

interface TerminalLineGutterProps {
  lineNumber: number;
  level: LogLevel;
  timestamp?: string;
  showTimestamp?: boolean;
}

export function TerminalLineGutter({
  lineNumber,
  level,
  timestamp,
  showTimestamp = true,
}: TerminalLineGutterProps) {
  return (
    <div className="flex items-center gap-2 select-none shrink-0 font-mono text-[11px] text-slate-600">
      {/* Severity Indicator Dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          level === 'ERROR'
            ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
            : level === 'WARN'
            ? 'bg-amber-400'
            : level === 'DEBUG'
            ? 'bg-purple-400'
            : 'bg-transparent'
        }`}
      />

      {/* 1-based Line Number */}
      <span className="w-9 text-right tabular-nums text-slate-600 hover:text-slate-400 transition-colors">
        {lineNumber}
      </span>

      {/* Optional Timestamp */}
      {showTimestamp && timestamp && (
        <span className="text-[10px] text-slate-600 w-16 truncate tabular-nums">
          {timestamp.length > 8 ? timestamp.slice(-8) : timestamp}
        </span>
      )}
    </div>
  );
}
