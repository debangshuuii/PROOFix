'use client';

/**
 * Terminal Search Input Component
 *
 * Provides in-terminal real-time log searching with regex toggle,
 * case sensitivity options, match count badge, and quick clear.
 */

import React from 'react';
import { Search, X } from 'lucide-react';

interface TerminalSearchInputProps {
  query: string;
  onChangeQuery: (q: string) => void;
  isRegex: boolean;
  onToggleRegex: () => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  matchCount?: number;
}

export function TerminalSearchInput({
  query,
  onChangeQuery,
  isRegex,
  onToggleRegex,
  caseSensitive,
  onToggleCaseSensitive,
  matchCount,
}: TerminalSearchInputProps) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        placeholder="Filter logs (Ctrl+F)..."
        className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none w-32 sm:w-44 text-[11px]"
      />

      {query && matchCount !== undefined && (
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-400">
          {matchCount}
        </span>
      )}

      {/* Regex Toggle Button */}
      <button
        type="button"
        onClick={onToggleRegex}
        title="Toggle Regular Expression"
        className={`px-1 rounded text-[10px] font-mono font-bold transition ${
          isRegex ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        .*
      </button>

      {/* Case Sensitivity Toggle Button */}
      <button
        type="button"
        onClick={onToggleCaseSensitive}
        title="Match Case"
        className={`px-1 rounded text-[10px] font-mono font-bold transition ${
          caseSensitive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Aa
      </button>

      {query && (
        <button
          type="button"
          onClick={() => onChangeQuery('')}
          aria-label="Clear log search"
          className="text-slate-500 hover:text-slate-300"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
