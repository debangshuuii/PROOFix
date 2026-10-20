# PROOFix Accessibility (a11y) Auditing (Contributions 94–95)

The **PROOFix Accessibility Auditing Engine** performs automated WCAG 2.1 AA audits on inspected web pages, verifies color contrast ratios, checks keyboard navigability, and provides actionable code-level remediation guidance.

---

## Architecture & Contributions (94–95)

| Contri | Component / File | Description |
|:---:|:---|:---|
| **94** | `src/lib/accessibility/axe-scanner.ts` | Automated WCAG 2.1 AA scanner evaluating images, form labels, buttons, links, document language, and ARIA roles with weighted scoring. |
| **95** | `src/lib/accessibility/contrast-analyzer.ts`<br>`src/lib/accessibility/keyboard-nav.ts`<br>`src/components/accessibility/AccessibilityAuditReport.tsx` | Relative luminance contrast ratio calculator (4.5:1 / 3.0:1), keyboard Tab navigability / focus trap tester, and interactive scorecard UI. |

---

## 1. Supported WCAG 2.1 AA Rules

| Rule ID | Standard | Severity | Description |
|:---|:---|:---:|:---|
| **`image-alt`** | WCAG 1.1.1 (A) | Critical | Ensures all `<img>` elements have informative alternate text or explicit decorative role. |
| **`button-name`** | WCAG 4.1.2 (A) | Critical | Buttons must have visible text, an `aria-label`, or an `aria-labelledby` reference. |
| **`label`** | WCAG 1.3.1 (A) | Critical | Every interactive form control (`input`, `select`, `textarea`) must have an associated `<label>`. |
| **`link-name`** | WCAG 2.4.4 (A) | Serious | Links must have discernible, non-empty anchor text or an accessible name. |
| **`html-has-lang`** | WCAG 3.1.1 (A) | Serious | Document root `<html>` element must specify a valid language code (e.g. `lang="en"`). |
| **`aria-valid-roles`** | WCAG 4.1.2 (A) | Serious | ARIA role attributes must contain valid, recognized WAI-ARIA role keywords. |
| **`color-contrast`** | WCAG 1.4.3 (AA) | Serious | Text must meet minimum contrast ratios against its computed background. |

---

## 2. Color Contrast Ratios (WCAG 1.4.3)

PROOFix calculates relative luminance $L = 0.2126R + 0.7152G + 0.0722B$ and enforces:
- **Normal Text** (< 18pt or < 14pt bold): minimum **4.5:1** contrast ratio.
- **Large Text** (≥ 18pt or ≥ 14pt bold): minimum **3.0:1** contrast ratio.

---

## 3. Keyboard Navigation Auditing

Simulates sequential `Tab` key progression across interactive page elements to verify:
1. **Focus Reachability**: Every clickable element (`onclick` or pointer cursor) is reachable via keyboard (`tabindex="0"`).
2. **Visible Focus Indicators**: Focusable elements do not remove outline without providing alternative visible focus indicators (`box-shadow` or border shifts).
3. **Focus Traps**: Keyboard focus can escape containers cleanly without looping infinitely in non-modal components.
4. **Skip Links**: Pages provide early bypass links to skip repetitive navigation headers.

---

## 4. Verification & CI Testing

Run the master accessibility CI suite:

```bash
npm run test:a11y
```
