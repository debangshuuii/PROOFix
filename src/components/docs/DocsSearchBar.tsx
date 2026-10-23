'use client';

/**
 * Documentation Search & Filter Bar Component
 *
 * Real-time filter across endpoint paths, summaries, and HTTP verbs.
 */

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { HttpMethod } from '@/lib/types/docs';

interface DocsSearchBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  selectedMethod?: HttpMethod;
  onSelectMethod: (m?: HttpMethod) => void;
  matchCount?: number;
}

export function DocsSearchBar({
  query,
  onChangeQuery,
  selectedMethod,
  onSelectMethod,
  matchCount,
}: DocsSearchBarProps) {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900/60 border-b border-slate-800 text-xs">
      {/* Search Input */}
      <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Filter endpoints by path or summary (e.g. /projects, stream, cgroups)..."
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChangeQuery('')}
            aria-label="Clear endpoint search"
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* HTTP Method Filters */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectMethod(undefined)}
          className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition ${
            !selectedMethod ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          ALL
        </button>
        {methods.map((m) => {
          const isSelected = selectedMethod === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMethod(isSelected ? undefined : m)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Count Badge */}
      {matchCount !== undefined && (
        <span className="text-[11px] font-mono text-slate-500">
          {matchCount} endpoint{matchCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}
