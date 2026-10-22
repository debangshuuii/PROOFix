/**
 * DOM Interactive Element Scanner
 * Discovers interactive elements, ARIA roles, input fields, and assigns
 * safety classification tiers based on semantic keywords and actions.
 */

import type { Page } from 'playwright';
import type {
  InteractiveElementDescriptor,
  InteractionSafetyTier,
} from '../types/interactive-ui-agent.ts';

export const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'drop',
  'destroy',
  'purge',
  'pay',
  'purchase',
  'checkout',
  'order now',
  'charge',
  'cancel subscription',
  'erase',
  'wipe',
  'format',
];

/**
 * Checks whether an element's text or attributes indicate a destructive operation.
 */
export function classifyDestructiveAction(text: string, ariaLabel?: string): {
  isDestructive: boolean;
  keyword?: string;
} {
  const combined = `${text || ''} ${ariaLabel || ''}`.toLowerCase();
  for (const kw of DESTRUCTIVE_KEYWORDS) {
    if (combined.includes(kw)) {
      return { isDestructive: true, keyword: kw };
    }
  }
  return { isDestructive: false };
}

/**
 * Scans page DOM for clickable and input-enabled interactive elements.
 */
export async function scanInteractiveElements(
  page: Page
): Promise<InteractiveElementDescriptor[]> {
  try {
    const rawElements = await page.evaluate((destructiveKeywords) => {
      const results: Array<{
        id: string;
        tagName: string;
        type: string;
        selector: string;
        text: string;
        ariaLabel: string;
        role: string;
      }> = [];

      const candidates = document.querySelectorAll(
        'button, input:not([type="hidden"]), select, textarea, [role="button"], [role="checkbox"], [role="tab"]'
      );

      candidates.forEach((el, index) => {
        // Check if visible
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        const tagName = el.tagName.toLowerCase();
        const id = el.id || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const role = el.getAttribute('role') || '';
        const type = (el as HTMLInputElement).type || '';
        const text = (el.textContent || (el as HTMLInputElement).value || '').trim().replace(/\s+/g, ' ');

        let selector = id ? `#${id}` : '';
        if (!selector) {
          selector = `${tagName}[data-testid="${el.getAttribute('data-testid')}"]`;
          if (!el.getAttribute('data-testid')) {
            selector = `${tagName}:nth-of-type(${index + 1})`;
          }
        }

        results.push({
          id,
          tagName,
          type,
          selector,
          text,
          ariaLabel,
          role,
        });
      });

      return results;
    }, DESTRUCTIVE_KEYWORDS);

    return rawElements.map((el) => {
      const { isDestructive, keyword } = classifyDestructiveAction(el.text, el.ariaLabel);
      const safetyTier: InteractionSafetyTier = isDestructive
        ? 'destructive_blocked'
        : el.tagName === 'input' || el.tagName === 'textarea' || el.tagName === 'select'
        ? 'simulated_input'
        : 'safe_read_only';

      return {
        id: el.id || undefined,
        tagName: el.tagName,
        type: el.type || undefined,
        selector: el.selector,
        text: el.text,
        ariaLabel: el.ariaLabel || undefined,
        role: el.role || undefined,
        safetyTier,
        isDestructive,
        destructiveKeyword: keyword,
      };
    });
  } catch {
    return [];
  }
}
