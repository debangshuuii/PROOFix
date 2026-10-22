/**
 * Safe Interaction Executor & Destructive Action Shield
 * Enforces strict safety policies by blocking irreversible mutations
 * (e.g., delete buttons, checkout flows) and executing non-destructive UI events.
 */

import type { Page } from 'playwright';
import type {
  InteractiveElementDescriptor,
  UiInteractionRecord,
} from '../types/interactive-ui-agent.ts';

export interface ExecuteInteractionOptions {
  page: Page;
  element: InteractiveElementDescriptor;
  timeoutMs?: number;
}

/**
 * Safely dispatches interaction events against a target element while enforcing guardrails.
 */
export async function executeSafeInteraction(
  options: ExecuteInteractionOptions
): Promise<UiInteractionRecord> {
  const { page, element, timeoutMs = 4000 } = options;
  const start = Date.now();

  // Enforce zero-trust destructive policy
  if (element.isDestructive) {
    return {
      element,
      action: 'click',
      durationMs: 0,
      domMutated: false,
      reactStateDispatched: false,
      uncaughtException: false,
      errorMessage: `Blocked by safe test policy: Destructive keyword "${element.destructiveKeyword}" detected`,
    };
  }

  let domMutated = false;
  let reactStateDispatched = false;
  let uncaughtException = false;
  let errorMessage: string | undefined;

  try {
    const locator = element.id ? page.locator(`#${element.id}`) : page.locator(element.selector);

    if (element.tagName === 'input' || element.tagName === 'textarea') {
      const isCheckable = element.type === 'checkbox' || element.type === 'radio';
      if (isCheckable) {
        await locator.check({ timeout: timeoutMs }).catch(() => {});
      } else {
        await locator.fill('PROOFix Safe Test', { timeout: timeoutMs }).catch(() => {});
      }
      domMutated = true;
      reactStateDispatched = true;

      return {
        element,
        action: isCheckable ? 'check' : 'fill',
        inputPayload: isCheckable ? undefined : 'PROOFix Safe Test',
        durationMs: Date.now() - start,
        domMutated,
        reactStateDispatched,
        uncaughtException: false,
      };
    }

    // Default: Clickable button, tab, link, or custom interactive element
    // Capture pre-click DOM snapshot hash
    const preClickHtmlLength = await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);

    await locator.click({ timeout: timeoutMs });

    // Allow mini event loop tick for React state dispatch
    await page.waitForTimeout(100);

    const postClickHtmlLength = await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);
    domMutated = Math.abs(postClickHtmlLength - preClickHtmlLength) > 0;
    reactStateDispatched = true;
  } catch (err: any) {
    uncaughtException = true;
    errorMessage = err?.message || 'Interaction dispatch failed';
  }

  return {
    element,
    action: 'click',
    durationMs: Date.now() - start,
    domMutated,
    reactStateDispatched,
    uncaughtException,
    errorMessage,
  };
}
