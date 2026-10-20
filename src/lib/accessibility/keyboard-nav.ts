import type {
  KeyboardNavCheckItem,
  KeyboardNavReport,
} from '../types/accessibility.ts';

export interface RawDomElementAudit {
  tagName: string;
  selector: string;
  accessibleName?: string;
  isFocusable: boolean;
  tabIndex: number;
  hasClickAction: boolean;
  hasKeyboardHandler: boolean;
  outlineStyle: string;
  boxShadow: string;
}

/**
 * Audits an element for keyboard accessibility issues.
 */
export function auditElementKeyboardAccessibility(raw: RawDomElementAudit): KeyboardNavCheckItem {
  const issues: string[] = [];

  // Check 1: Clickable elements must be focusable
  if (raw.hasClickAction && !raw.isFocusable) {
    issues.push('Clickable element is not reachable via Tab keyboard navigation (missing tabindex="0").');
  }

  // Check 2: Custom interactive elements must have keyboard handlers (e.g. Enter or Space)
  if (raw.hasClickAction && !['a', 'button', 'input', 'select', 'textarea'].includes(raw.tagName.toLowerCase())) {
    if (!raw.hasKeyboardHandler) {
      issues.push('Custom interactive element does not support Enter or Space keydown events.');
    }
  }

  // Check 3: Visible focus indicator
  const hasOutline = Boolean(raw.outlineStyle && raw.outlineStyle !== 'none' && !raw.outlineStyle.startsWith('0px'));
  const hasBoxShadow = Boolean(raw.boxShadow && raw.boxShadow !== 'none');
  const hasVisibleFocusIndicator = hasOutline || hasBoxShadow;

  if (raw.isFocusable && !hasVisibleFocusIndicator) {
    issues.push('Element removes focus outline without providing an alternative visible focus indicator.');
  }

  // Check 4: Positive tabindex warning (anti-pattern disrupting natural tab flow)
  if (raw.tabIndex > 0) {
    issues.push(`Positive tabindex (${raw.tabIndex}) disrupts natural DOM navigation order.`);
  }

  return {
    selector: raw.selector,
    tagName: raw.tagName,
    accessibleName: raw.accessibleName,
    isFocusable: raw.isFocusable,
    hasVisibleFocusIndicator,
    tabIndex: raw.tabIndex,
    hasKeyboardAction: raw.hasKeyboardHandler || ['a', 'button', 'input', 'select'].includes(raw.tagName.toLowerCase()),
    issues,
  };
}

/**
 * Evaluates full page keyboard navigation structure.
 */
export function evaluateKeyboardNavigation(
  elements: RawDomElementAudit[],
  options: { hasSkipLink?: boolean; focusTrapDetected?: boolean } = {}
): KeyboardNavReport {
  const auditedElements = elements.map(auditElementKeyboardAccessibility);

  const reachableViaTab = auditedElements.filter((el) => el.isFocusable && el.tabIndex >= 0).length;
  const missingFocusIndicatorsCount = auditedElements.filter((el) => el.isFocusable && !el.hasVisibleFocusIndicator).length;
  const unfocusableClickablesCount = auditedElements.filter((el) => el.issues.some((i) => i.includes('not reachable via Tab'))).length;

  const issues: string[] = [];
  if (unfocusableClickablesCount > 0) {
    issues.push(`${unfocusableClickablesCount} interactive element(s) cannot be reached via keyboard Tab navigation.`);
  }
  if (missingFocusIndicatorsCount > 0) {
    issues.push(`${missingFocusIndicatorsCount} focusable element(s) lack a visible focus outline indicator.`);
  }
  if (options.focusTrapDetected) {
    issues.push('Unintentional focus trap detected: keyboard focus cannot escape container.');
  }
  if (!options.hasSkipLink) {
    issues.push('Page lacks a "Skip to Content" bypass link for keyboard users.');
  }

  const passed =
    unfocusableClickablesCount === 0 &&
    !options.focusTrapDetected &&
    missingFocusIndicatorsCount === 0;

  return {
    passed,
    totalInteractiveElements: elements.length,
    reachableViaTab,
    missingFocusIndicatorsCount,
    unfocusableClickablesCount,
    hasSkipLink: options.hasSkipLink ?? false,
    focusTrapDetected: options.focusTrapDetected ?? false,
    elements: auditedElements,
    issues,
  };
}
