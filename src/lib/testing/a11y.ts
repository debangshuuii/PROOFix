import { Page } from 'playwright';

export interface AccessibilityViolation {
  rule: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  selector: string;
  htmlSnippet?: string;
}

export async function runAccessibilityAudit(page: Page): Promise<AccessibilityViolation[]> {
  return await page.evaluate(() => {
    const violations: any[] = [];

    // 1. Check for images missing alt attributes
    const images = Array.from(document.querySelectorAll('img'));
    for (const img of images) {
      if (!img.hasAttribute('alt')) {
        violations.push({
          rule: 'image-alt',
          impact: 'critical',
          description: 'Image is missing an alt attribute, hindering screen reader accessibility.',
          selector: img.className ? `img.${img.className.split(' ').join('.')}` : 'img',
          htmlSnippet: img.outerHTML.substring(0, 100),
        });
      }
    }

    // 2. Check for buttons without text or aria-label
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim();
      const ariaLabel = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby');
      const title = btn.getAttribute('title');
      if (!text && !ariaLabel && !title) {
        violations.push({
          rule: 'button-name',
          impact: 'critical',
          description: 'Button element has no accessible name or text content.',
          selector: btn.id ? `#${btn.id}` : 'button',
          htmlSnippet: btn.outerHTML.substring(0, 100),
        });
      }
    }

    // 3. Check for form inputs missing labels
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
    for (const input of inputs) {
      const id = input.id;
      const ariaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      const hasLabel = id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false;
      const hasParentLabel = Boolean(input.closest('label'));

      if (!hasLabel && !hasParentLabel && !ariaLabel) {
        violations.push({
          rule: 'label',
          impact: 'serious',
          description: 'Form input field is missing an associated <label> or aria-label attribute.',
          selector: id ? `#${id}` : 'input',
          htmlSnippet: input.outerHTML.substring(0, 100),
        });
      }
    }

    // 4. Check for html[lang] attribute
    if (!document.documentElement.getAttribute('lang')) {
      violations.push({
        rule: 'html-has-lang',
        impact: 'serious',
        description: 'Document <html> element does not specify a lang attribute.',
        selector: 'html',
      });
    }

    // 5. Check for duplicate ID attributes
    const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
    const idCounts: Record<string, number> = {};
    for (const id of allIds) {
      idCounts[id] = (idCounts[id] || 0) + 1;
    }
    for (const [id, count] of Object.entries(idCounts)) {
      if (count > 1) {
        violations.push({
          rule: 'duplicate-id',
          impact: 'moderate',
          description: `Document contains duplicate id attribute: "${id}" (${count} occurrences).`,
          selector: `#${id}`,
        });
      }
    }

    return violations;
  });
}
