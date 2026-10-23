'use client';

/**
 * Enterprise Theme Provider with localStorage Persistence
 *
 * Manages dark / light / system modes, listens to OS media queries,
 * and eliminates flash-of-unstyled-content (FOUC).
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ThemeMode, ResolvedTheme, ThemeContextValue } from '@/lib/types/theme';
import { THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/types/theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // Initialize theme from localStorage & system preference
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored && (stored === 'dark' || stored === 'light' || stored === 'system')) {
        setThemeState(stored);
      }
    } catch {
      // Ignore local storage error in sandboxed iframe
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemIsDark(mq.matches);

      const handler = (e: MediaQueryListEvent) => {
        setSystemIsDark(e.matches);
      };

      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      } else if ((mq as any).addListener) {
        (mq as any).addListener(handler);
        return () => (mq as any).removeListener(handler);
      }
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  // Apply theme to document element
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable
    }
  };

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
