import { ViewportProfile } from '../types/viewport';

export interface ResponsiveNavigationConfig {
  navSelectors?: string[];
  menuToggleSelectors?: string[];
  keyLinks?: string[];
  requireToggleUnderWidth?: number;
}

export interface ResponsiveNavigationAuditResult {
  profileId: string;
  profileName: string;
  viewport: { width: number; height: number };
  passed: boolean;
  navElementVisible: boolean;
  toggleEvaluated: boolean;
  toggleFound: boolean;
  toggleInteractive: boolean;
  toggleExpandedMenu: boolean;
  keyLinksChecked: string[];
  accessibleLinks: string[];
  missingLinks: string[];
  diagnosticMessage: string;
}

export const DEFAULT_NAV_SELECTORS = [
  'nav',
  'header nav',
  '[role="navigation"]',
  '#main-nav',
  '.site-nav',
];

export const DEFAULT_MENU_TOGGLE_SELECTORS = [
  'button[aria-label*="menu"]',
  'button[aria-expanded]',
  '.menu-toggle',
  '[data-testid="mobile-menu-btn"]',
  '#mobile-menu-toggle',
  '.hamburger',
];

export interface FixtureNavState {
  hasNavElement: boolean;
  isNavVisible: boolean;
  hasToggle: boolean;
  isToggleVisible: boolean;
  toggleCanExpand: boolean;
  desktopLinks: string[];
  mobileDrawerLinks: string[];
}

/**
 * Evaluates responsive navigation on a viewport profile against a navigation state fixture.
 */
export function auditResponsiveNavigation(
  profile: ViewportProfile,
  state: FixtureNavState,
  config: ResponsiveNavigationConfig = {}
): ResponsiveNavigationAuditResult {
  const threshold = config.requireToggleUnderWidth ?? 768;
  const isMobileLayout = profile.width <= threshold;
  const keyLinks = config.keyLinks && config.keyLinks.length > 0 ? config.keyLinks : ['/', '/about'];

  if (!state.hasNavElement) {
    return {
      profileId: profile.id,
      profileName: profile.name,
      viewport: { width: profile.width, height: profile.height },
      passed: false,
      navElementVisible: false,
      toggleEvaluated: isMobileLayout,
      toggleFound: false,
      toggleInteractive: false,
      toggleExpandedMenu: false,
      keyLinksChecked: keyLinks,
      accessibleLinks: [],
      missingLinks: keyLinks,
      diagnosticMessage: `No navigation landmark (<nav> or role="navigation") found at ${profile.name} (${profile.width}px).`,
    };
  }

  if (isMobileLayout) {
    // Mobile Navigation Audit:
    // Requires working menu toggle button that expands navigation drawer with key links
    if (!state.hasToggle || !state.isToggleVisible) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height },
        passed: false,
        navElementVisible: state.isNavVisible,
        toggleEvaluated: true,
        toggleFound: false,
        toggleInteractive: false,
        toggleExpandedMenu: false,
        keyLinksChecked: keyLinks,
        accessibleLinks: [],
        missingLinks: keyLinks,
        diagnosticMessage: `Mobile menu toggle button is missing or hidden at ${profile.name} (${profile.width}px).`,
      };
    }

    if (!state.toggleCanExpand) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height },
        passed: false,
        navElementVisible: state.isNavVisible,
        toggleEvaluated: true,
        toggleFound: true,
        toggleInteractive: false,
        toggleExpandedMenu: false,
        keyLinksChecked: keyLinks,
        accessibleLinks: [],
        missingLinks: keyLinks,
        diagnosticMessage: `Mobile menu toggle failed to expand navigation drawer when clicked at ${profile.name}.`,
      };
    }

    // Check links inside mobile drawer
    const missing = keyLinks.filter((link) => !state.mobileDrawerLinks.includes(link));
    const accessible = keyLinks.filter((link) => state.mobileDrawerLinks.includes(link));

    if (missing.length > 0) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height },
        passed: false,
        navElementVisible: true,
        toggleEvaluated: true,
        toggleFound: true,
        toggleInteractive: true,
        toggleExpandedMenu: true,
        keyLinksChecked: keyLinks,
        accessibleLinks: accessible,
        missingLinks: missing,
        diagnosticMessage: `Mobile drawer is missing key destination links [${missing.join(', ')}] at ${profile.name}.`,
      };
    }

    return {
      profileId: profile.id,
      profileName: profile.name,
      viewport: { width: profile.width, height: profile.height },
      passed: true,
      navElementVisible: true,
      toggleEvaluated: true,
      toggleFound: true,
      toggleInteractive: true,
      toggleExpandedMenu: true,
      keyLinksChecked: keyLinks,
      accessibleLinks: accessible,
      missingLinks: [],
      diagnosticMessage: `Mobile navigation and drawer toggle verified accessible at ${profile.name}.`,
    };
  } else {
    // Desktop Navigation Audit:
    // Navigation is visible directly; key links should be accessible without clicking mobile toggle
    if (!state.isNavVisible) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height },
        passed: false,
        navElementVisible: false,
        toggleEvaluated: false,
        toggleFound: false,
        toggleInteractive: false,
        toggleExpandedMenu: false,
        keyLinksChecked: keyLinks,
        accessibleLinks: [],
        missingLinks: keyLinks,
        diagnosticMessage: `Main desktop navigation bar is not visible at ${profile.name} (${profile.width}px).`,
      };
    }

    const missing = keyLinks.filter((link) => !state.desktopLinks.includes(link));
    const accessible = keyLinks.filter((link) => state.desktopLinks.includes(link));

    if (missing.length > 0) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height },
        passed: false,
        navElementVisible: true,
        toggleEvaluated: false,
        toggleFound: false,
        toggleInteractive: false,
        toggleExpandedMenu: false,
        keyLinksChecked: keyLinks,
        accessibleLinks: accessible,
        missingLinks: missing,
        diagnosticMessage: `Desktop navigation is missing key links [${missing.join(', ')}] at ${profile.name}.`,
      };
    }

    return {
      profileId: profile.id,
      profileName: profile.name,
      viewport: { width: profile.width, height: profile.height },
      passed: true,
      navElementVisible: true,
      toggleEvaluated: false,
      toggleFound: false,
      toggleInteractive: false,
      toggleExpandedMenu: false,
      keyLinksChecked: keyLinks,
      accessibleLinks: accessible,
      missingLinks: [],
      diagnosticMessage: `Desktop navigation bar and key links verified visible and accessible at ${profile.name}.`,
    };
  }
}
