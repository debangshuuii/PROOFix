'use client';

import React, { useState, useEffect } from 'react';
import { Keyboard, X, Command } from 'lucide-react';
import { PLATFORM_SHORTCUTS } from '@/lib/navigation/shortcut-registry';

interface ShortcutCheatSheetProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ShortcutCheatSheet({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: ShortcutCheatSheetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) controlledOnClose();
    else setInternalIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (controlledIsOpen !== undefined) {
          if (isModalOpen && controlledOnClose) controlledOnClose();
        } else {
          setInternalIsOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, controlledIsOpen, controlledOnClose]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Keyboard Shortcuts Cheat Sheet</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-4 max-h-[450px] overflow-y-auto divide-y divide-slate-800/60">
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</h3>
            {PLATFORM_SHORTCUTS.filter((s) => s.category === 'core' || s.category === 'enterprise').map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-300">{s.description}</span>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono text-[11px] shadow-sm">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actions & Operations</h3>
            {PLATFORM_SHORTCUTS.filter((s) => s.category === 'testing' || s.category === 'security').map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-300">{s.description}</span>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono text-[11px] shadow-sm">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          <span>Press ? anywhere to toggle</span>
          <span>PROOFix Power Shortcuts</span>
        </div>
      </div>
    </div>
  );
}
