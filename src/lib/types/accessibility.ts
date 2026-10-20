/**
 * PROOFix Accessibility (a11y) Auditing Types
 * WCAG 2.1 AA Standards, axe-core Rules, Contrast, and Keyboard Navigation.
 */

export type AccessibilityStandard =
  | 'wcag2a'
  | 'wcag2aa'
  | 'wcag21a'
  | 'wcag21aa'
  | 'best-practice';

export type A11yImpact = 'critical' | 'serious' | 'moderate' | 'minor';

export interface A11yNodeViolation {
  html: string;
  target: string[];
  failureSummary: string;
  fixGuidance?: string;
}

export interface A11yViolation {
  id: string;
  impact: A11yImpact;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yNodeViolation[];
}

export interface A11yAuditSummary {
  url: string;
  standard: AccessibilityStandard;
  score: number; // 0 to 100
  rating: 'compliant' | 'needs-attention' | 'non-compliant';
  violations: A11yViolation[];
  violationsCount: number;
  passesCount: number;
  incompleteCount: number;
  inapplicableCount: number;
  auditedAt: string;
}

export interface KeyboardNavCheckItem {
  selector: string;
  tagName: string;
  accessibleName?: string;
  isFocusable: boolean;
  hasVisibleFocusIndicator: boolean;
  tabIndex: number;
  hasKeyboardAction: boolean;
  issues: string[];
}

export interface KeyboardNavReport {
  passed: boolean;
  totalInteractiveElements: number;
  reachableViaTab: number;
  missingFocusIndicatorsCount: number;
  unfocusableClickablesCount: number;
  hasSkipLink: boolean;
  focusTrapDetected: boolean;
  elements: KeyboardNavCheckItem[];
  issues: string[];
}

export interface ContrastAuditItem {
  selector: string;
  textSnippet: string;
  textColor: string;
  backgroundColor: string;
  fontSizePx: number;
  isBold: boolean;
  contrastRatio: number; // e.g. 4.5
  requiredRatio: number; // 4.5:1 normal, 3.0:1 large
  passes: boolean;
}

export interface ContrastAuditReport {
  passed: boolean;
  elementsAudited: number;
  failingCount: number;
  items: ContrastAuditItem[];
}
