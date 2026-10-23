'use client';

/**
 * ThemeSwitcher Component
 *
 * Glassmorphic interactive theme selector supporting Dark, Light,
 * and System OS preference modes with smooth micro-animations.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import type { ThemeMode } from '@/lib/types/theme';

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const options: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-label={`Current theme: ${theme}. Click to change theme.`}
        aria-expanded={dropdownOpen}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-sky-400 animate-in fade-in" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400 animate-in fade-in" />
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 py-1 text-xs divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Appearance
          </div>
          <div className="py-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setTheme(opt.mode);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-sky-500/10 text-sky-400 font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
