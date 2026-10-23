/**
 * Mobile Navigation & Responsive Drawer Types
 *
 * Defines drawer state, navigation section hierarchy, and keyboard event handlers.
 */

export interface NavSectionItem {
  href: string;
  label: string;
  iconName: string;
  badge?: string;
  description?: string;
}

export interface MobileDrawerState {
  isOpen: boolean;
  activeHref: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
