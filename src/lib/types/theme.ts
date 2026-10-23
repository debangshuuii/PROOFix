/**
 * Theme & UI Customization Types
 *
 * Defines theme modes, resolved system themes, and context contracts
 * for zero-flicker light/dark/system theme management.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'proofix_theme_preference';
export const DEFAULT_THEME: ThemeMode = 'system';
