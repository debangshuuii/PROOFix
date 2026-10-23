'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CommandAction, NavigationCategory } from '@/lib/types/navigation-palette';
import { globalCommandIndexer } from '@/lib/navigation/command-indexer';
import {
  Search,
  LayoutDashboard,
  FolderGit2,
  Settings,
  Shield,
  Layers,
  ShieldCheck,
  Play,
  Terminal,
  RotateCcw,
  Download,
  Flame,
  ArrowRight,
  Command,
  X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  FolderGit2,
  Settings,
  Shield,
  Layers,
  ShieldCheck,
  Play,
  Terminal,
  RotateCcw,
  Download,
  Flame,
};

interface CommandPaletteModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onExecuteAction?: (action: CommandAction) => void;
}

export function CommandPaletteModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onExecuteAction,
}: CommandPaletteModalProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NavigationCategory | undefined>();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setSearchQuery('');
    setSelectedIndex(0);
  };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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

  // Focus input when opened
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isModalOpen]);

  const actions = globalCommandIndexer.search(searchQuery, selectedCategory);

  // Arrow key navigation
  useEffect(() => {
    const handleNavigationKeys = (e: KeyboardEvent) => {
      if (!isModalOpen || actions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % actions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + actions.length) % actions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = actions[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      }
    };

    window.addEventListener('keydown', handleNavigationKeys);
    return () => window.removeEventListener('keydown', handleNavigationKeys);
  }, [isModalOpen, actions, selectedIndex]);

  const executeCommand = (action: CommandAction) => {
    handleClose();
    if (onExecuteAction) {
      onExecuteAction(action);
    }
    if (action.href) {
      router.push(action.href);
    }
  };

  if (!isModalOpen) return null;

  const categories: Array<{ id?: NavigationCategory; label: string }> = [
    { label: 'All' },
    { id: 'projects', label: 'Projects' },
    { id: 'runs', label: 'Runs' },
    { id: 'failures', label: 'Failing Tests' },
    { id: 'proposals', label: 'Fix Proposals' },
    { id: 'enterprise', label: 'Enterprise' },
    { id: 'testing', label: 'Testing' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[550px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, enterprise portals, or test runs (e.g. sandbox, dlq, soc2)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ESC to close
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/50 border-b border-slate-800/60 overflow-x-auto">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.label}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedIndex(0);
                }}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Action Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {actions.length > 0 ? (
            actions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComponent = ICON_MAP[action.iconName] || Terminal;

              return (
                <div
                  key={action.id}
                  onClick={() => executeCommand(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-600/20 text-white border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs truncate">{action.title}</span>
                        {action.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${
                              action.status === 'passed'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                                : action.status === 'failed'
                                ? 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                                : action.status === 'running'
                                ? 'bg-amber-950/80 text-amber-400 border-amber-800/60 animate-pulse'
                                : action.status === 'proposed'
                                ? 'bg-violet-950/80 text-violet-400 border-violet-800/60'
                                : action.status === 'applied'
                                ? 'bg-sky-950/80 text-sky-400 border-sky-800/60'
                                : 'bg-slate-800 text-sky-300 border-slate-700'
                            }`}
                          >
                            {action.badge}
                          </span>
                        )}
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-950 text-slate-500 border border-slate-800">
                          {action.category}
                        </span>
                      </div>
                      {action.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{action.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {action.shortcut && (
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                        {action.shortcut.map((k) => (
                          <span key={k} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition ${
                        isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No matching commands found for &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>PROOFix Command Hub</span>
        </div>
      </div>
    </div>
  );
}
