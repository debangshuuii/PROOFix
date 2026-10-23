'use client';

/**
 * Terminal Filter Toolbar
 *
 * Provides granular log-level filter toggles (ALL, ERROR, WARN, INFO, DEBUG)
 * with individual severity counts and distinct status badges.
 */

import React from 'react';
import type { LogLevel } from '@/lib/types/terminal';
import { AlertCircle, AlertTriangle, Info, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalToolbarProps {
  currentLevel: LogLevel;
  onSelectLevel: (level: LogLevel) => void;
  counts: Record<LogLevel, number>;
  children?: React.ReactNode;
}

export function TerminalToolbar({
  currentLevel,
  onSelectLevel,
  counts,
  children,
}: TerminalToolbarProps) {
  const levels: Array<{ id: LogLevel; label: string; icon?: React.ElementType; color: string }> = [
    { id: 'ALL', label: 'All Logs', color: 'slate' },
    { id: 'ERROR', label: 'Errors', icon: AlertCircle, color: 'rose' },
    { id: 'WARN', label: 'Warnings', icon: AlertTriangle, color: 'amber' },
    { id: 'INFO', label: 'Info', icon: Info, color: 'sky' },
    { id: 'DEBUG', label: 'Debug', icon: TerminalIcon, color: 'purple' },
  ];

  return (
    <div className="bg-slate-950/90 border-b border-slate-800/80 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Level Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {levels.map((lvl) => {
          const isSelected = currentLevel === lvl.id;
          const count = counts[lvl.id] || 0;
          const Icon = lvl.icon;

          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => onSelectLevel(lvl.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                isSelected
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span>{lvl.label}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-sky-950 text-sky-300'
                    : count > 0 && lvl.id === 'ERROR'
                    ? 'bg-rose-950 text-rose-400 font-bold'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trailing Controls (Search & Auto-Scroll) */}
      <div className="flex items-center gap-2 ml-auto">{children}</div>
    </div>
  );
}
