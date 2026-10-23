/**
 * Unified Enterprise Navigation & Command Palette Types (Contribution 181)
 */

export type NavigationCategory =
  | 'core'
  | 'enterprise'
  | 'testing'
  | 'security'
  | 'operations'
  | 'projects'
  | 'runs'
  | 'failures'
  | 'proposals';

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  category: NavigationCategory;
  href?: string;
  shortcut?: string[]; // e.g. ['g', 's'] or ['Meta', 'k']
  iconName: string;
  keywords: string[];
  badge?: string;
  actionType: 'navigate' | 'execute' | 'filter';
  handlerId?: string;
  status?: 'passed' | 'failed' | 'running' | 'pending' | 'proposed' | 'applied';
  metadata?: Record<string, string | number>;
}

export interface RecentVisitItem {
  id: string;
  title: string;
  href: string;
  iconName: string;
  category: NavigationCategory;
  visitedAt: string;
}

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  active: boolean;
}

export interface NavigationShortcut {
  key: string;
  description: string;
  category: NavigationCategory;
  ctrlOrMeta?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedCategory?: NavigationCategory;
  filteredActions: CommandAction[];
  selectedIndex: number;
}
