'use client';

/**
 * Virtualized Terminal Row Component
 *
 * Renders an individual terminal row at a fixed height (22px) with
 * gutter numbering, parsed ANSI colors, font weights, and search highlights.
 */

import React from 'react';
import type { TerminalLine } from '@/lib/types/terminal';
import { TerminalLineGutter } from './TerminalLineGutter';
import { LogSearchMatcher } from '@/lib/terminal/search-matcher';

interface VirtualizedTerminalRowProps {
  line: TerminalLine;
  searchQuery?: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
  style?: React.CSSProperties;
}

export const VirtualizedTerminalRow = React.memo(function VirtualizedTerminalRow({
  line,
  searchQuery,
  isRegex = false,
  caseSensitive = false,
  style,
}: VirtualizedTerminalRowProps) {
  return (
    <div
      style={style}
      className={`h-[22px] flex items-center px-3 font-mono text-[12px] leading-[22px] hover:bg-slate-900/60 transition-colors whitespace-pre overflow-hidden ${
        line.level === 'ERROR'
          ? 'bg-rose-950/20 text-rose-300'
          : line.level === 'WARN'
          ? 'bg-amber-950/15 text-amber-300'
          : 'text-slate-300'
      }`}
    >
      {/* Line Gutter (Number + Indicator + Timestamp) */}
      <TerminalLineGutter lineNumber={line.lineNumber} level={line.level} timestamp={line.timestamp} />

      <div className="h-3 w-px bg-slate-800/80 mx-2.5 shrink-0" />

      {/* Styled ANSI Tokens */}
      <div className="flex-1 overflow-hidden truncate">
        {line.tokens.map((token, tIdx) => {
          const tokenStyle: React.CSSProperties = {
            color: token.color,
            backgroundColor: token.bgColor,
            fontWeight: token.bold ? 700 : undefined,
            opacity: token.dim ? 0.6 : undefined,
            fontStyle: token.italic ? 'italic' : undefined,
            textDecoration: token.underline ? 'underline' : undefined,
          };

          if (searchQuery) {
            const segments = LogSearchMatcher.segment(token.text, searchQuery, isRegex, caseSensitive);
            return (
              <span key={tIdx} style={tokenStyle}>
                {segments.map((seg, sIdx) =>
                  seg.isMatch ? (
                    <mark
                      key={sIdx}
                      className="bg-amber-400/30 text-amber-200 border-b border-amber-400 rounded-px px-0.5"
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={sIdx}>{seg.text}</span>
                  )
                )}
              </span>
            );
          }

          return (
            <span key={tIdx} style={tokenStyle}>
              {token.text}
            </span>
          );
        })}
      </div>
    </div>
  );
});
