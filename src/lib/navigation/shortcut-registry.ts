/**
 * Platform Keyboard Shortcut Registry (Contribution 186)
 */

import type { NavigationShortcut } from '../types/navigation-palette.ts';

export const PLATFORM_SHORTCUTS: NavigationShortcut[] = [
  // Navigation
  { key: 'Cmd / Ctrl + K', description: 'Open Command Palette & Search', category: 'core' },
  { key: 'g then d', description: 'Go to Dashboard Overview', category: 'core' },
  { key: 'g then p', description: 'Go to Projects Directory', category: 'core' },
  { key: 'g then x', description: 'Go to Sandbox & MicroVM Isolation', category: 'enterprise' },
  { key: 'g then q', description: 'Go to Distributed Queues & DB', category: 'enterprise' },
  { key: 'g then g', description: 'Go to Enterprise Governance & SOC2', category: 'security' },
  { key: 'g then s', description: 'Go to Settings', category: 'core' },

  // Actions
  { key: 't then r', description: 'Trigger Verification Run in Sandbox', category: 'testing' },
  { key: 't then f', description: 'Start API Fuzzing Audit', category: 'testing' },
  { key: 'e then e', description: 'Export SOC2 Auditor Evidence Bundle', category: 'security' },

  // General
  { key: '?', description: 'Toggle this Shortcuts Cheat Sheet', category: 'core' },
  { key: 'Esc', description: 'Close any active modal or dialog', category: 'core' },
];
