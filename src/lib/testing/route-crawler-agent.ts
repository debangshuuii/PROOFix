/**
 * Recursive Route Crawler Agent
 * Discovers internal hyperlinks via Playwright DOM evaluation, normalizes paths,
 * tracks parent-child route graphs, and guards against cyclic navigation loops.
 */

import type { Page } from 'playwright';
import type {
  NavigationCrawlerConfig,
  RouteNavigationCheck,
} from '../types/navigation-crawler.ts';

export const DEFAULT_CRAWLER_CONFIG: NavigationCrawlerConfig = {
  maxDepth: 3,
  maxRoutes: 25,
  normalizeTrailingSlash: true,
  timeoutPerRouteMs: 12000,
  captureScreenshots: true,
  detectRedirectLoops: true,
  recordNavigationTiming: true,
};

/**
 * Normalizes URL path into a standard internal route key.
 */
export function normalizeRoutePath(rawHref: string, baseUrl: string): string | null {
  if (!rawHref) return null;
  const trimmed = rawHref.trim();

  // Filter out non-navigational links
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed === '#' ||
    trimmed.startsWith('#')
  ) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, baseUrl);
    const baseParsed = new URL(baseUrl);

    // Only allow internal same-origin links
    if (parsed.origin !== baseParsed.origin) {
      return null;
    }

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return pathname || '/';
  } catch {
    if (trimmed.startsWith('/')) {
      return trimmed.split('?')[0].split('#')[0] || '/';
    }
    return null;
  }
}

/**
 * Extracts all valid internal anchor links from the current page DOM.
 */
export async function extractInternalAnchors(
  page: Page,
  baseUrl: string
): Promise<Array<{ href: string; text: string }>> {
  try {
    const rawAnchors = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => ({
        href: a.getAttribute('href') || '',
        text: (a.textContent || '').trim().replace(/\s+/g, ' '),
      }))
    );

    const validAnchors: Array<{ href: string; text: string }> = [];
    const seen = new Set<string>();

    for (const item of rawAnchors) {
      const normalized = normalizeRoutePath(item.href, baseUrl);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        validAnchors.push({ href: normalized, text: item.text });
      }
    }

    return validAnchors;
  } catch {
    return [];
  }
}
