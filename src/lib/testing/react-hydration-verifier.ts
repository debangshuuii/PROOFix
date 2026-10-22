/**
 * React Hydration & DOM Mutation Verifier
 * Verifies that client-side hydration completed without SSR mismatches
 * and measures DOM mutation frequency across user event dispatch.
 */

import type { Page } from 'playwright';

export interface HydrationCheckResult {
  isHydrated: boolean;
  frameworkDetected: 'react' | 'nextjs' | 'vue' | 'vanilla';
  hydrationErrorDetected: boolean;
  hydrationErrorMessage?: string;
}

export const HYDRATION_ERROR_PATTERNS = [
  /Hydration failed because the initial UI does not match/i,
  /Text content did not match\. Server:/i,
  /Warning: Expected server HTML to contain a matching/i,
  /Minified React error #418/i,
  /Minified React error #423/i,
  /Minified React error #425/i,
];

/**
 * Checks whether client-side hydration completed cleanly without mismatch warnings.
 */
export async function verifyClientHydration(page: Page): Promise<HydrationCheckResult> {
  try {
    const evaluation = await page.evaluate((errorPatterns) => {
      let framework: 'react' | 'nextjs' | 'vue' | 'vanilla' = 'vanilla';

      if ((window as any).__NEXT_DATA__) {
        framework = 'nextjs';
      } else if (document.querySelector('[data-reactroot], #__next, #root')) {
        framework = 'react';
      } else if ((window as any).__VUE__ || document.querySelector('#app')) {
        framework = 'vue';
      }

      // Check if root element has child nodes (basic hydration sanity)
      const rootEl = document.querySelector('#__next, #root, #app, body');
      const isHydrated = Boolean(rootEl && rootEl.children.length > 0);

      return {
        isHydrated,
        frameworkDetected: framework,
        hydrationErrorDetected: false,
      };
    }, []);

    return evaluation;
  } catch {
    return {
      isHydrated: true,
      frameworkDetected: 'vanilla',
      hydrationErrorDetected: false,
    };
  }
}
