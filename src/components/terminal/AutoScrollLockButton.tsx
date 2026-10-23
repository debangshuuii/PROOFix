'use client';

/**
 * Auto-Scroll Lock Button Component
 *
 * Controls viewport stickiness to the bottom during live streaming runs.
 * Automatically unpins when the user manually scrolls up to inspect logs,
 * and allows 1-click re-pinning with a smooth bottom scroll.
 */

import React from 'react';
import { ArrowDown, Lock, Unlock } from 'lucide-react';

interface AutoScrollLockButtonProps {
  isLocked: boolean;
  onToggleLock: () => void;
  onScrollToBottom: () => void;
}

export function AutoScrollLockButton({
  isLocked,
  onToggleLock,
  onScrollToBottom,
}: AutoScrollLockButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!isLocked) {
          onScrollToBottom();
        }
        onToggleLock();
      }}
      title={isLocked ? 'Auto-scroll enabled (click to unlock)' : 'Auto-scroll paused (click to pin bottom)'}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition border ${
        isLocked
          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 font-semibold'
          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
      }`}
    >
      {isLocked ? (
        <>
          <Lock className="w-3 h-3 text-sky-400" />
          <span>Follow Tail</span>
        </>
      ) : (
        <>
          <ArrowDown className="w-3 h-3 text-amber-400 animate-bounce" />
          <span className="text-amber-300">Resume Tail</span>
        </>
      )}
    </button>
  );
}
