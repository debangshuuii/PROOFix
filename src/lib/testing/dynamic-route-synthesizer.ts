/**
 * Dynamic Route Parameter Synthesizer
 * Identifies Next.js and React Router dynamic patterns (e.g. [id], [slug], [...catchAll])
 * and replaces parameter tokens with deterministic synthetic test fixtures.
 */

import type { DynamicSlugRule } from '../types/navigation-crawler.ts';

export const DEFAULT_SYNTHESIS_RULES: DynamicSlugRule[] = [
  {
    pattern: /\[(?:id|itemId|productId|orderId|runId|userId)\]/gi,
    placeholder: '[id]',
    syntheticValue: '1',
    rationale: 'Numeric primary key identifier',
  },
  {
    pattern: /\[(?:slug|articleSlug|postSlug|category)\]/gi,
    placeholder: '[slug]',
    syntheticValue: 'sample-item',
    rationale: 'URL-friendly slug segment',
  },
  {
    pattern: /\[(?:\.\.\.catchAll|\.\.\.rest|\.\.\.slug)\]/gi,
    placeholder: '[...catchAll]',
    syntheticValue: 'overview',
    rationale: 'Catch-all wildcard router parameter',
  },
  {
    pattern: /\[(?:username|user|author)\]/gi,
    placeholder: '[user]',
    syntheticValue: 'testuser',
    rationale: 'User handle or author profile',
  },
  {
    pattern: /\[([a-zA-Z0-9_\-]+)\]/g,
    placeholder: '[$1]',
    syntheticValue: 'test-$1',
    rationale: 'Generic dynamic parameter fallback',
  },
];

/**
 * Checks if a route path contains dynamic parameter placeholders.
 */
export function isDynamicRoute(routePath: string): boolean {
  return /\[.+\]/.test(routePath) || /:[a-zA-Z0-9_]+/.test(routePath);
}

/**
 * Replaces dynamic route tokens with synthetic, navigable values.
 */
export function synthesizeDynamicRoute(
  routePath: string,
  rules: DynamicSlugRule[] = DEFAULT_SYNTHESIS_RULES
): { synthesizedRoute: string; substitutedTokens: string[] } {
  let result = routePath;
  const substitutedTokens: string[] = [];

  // 1. Next.js App Router square-bracket parameters
  for (const rule of rules) {
    if (rule.pattern.test(result)) {
      result = result.replace(rule.pattern, () => {
        substitutedTokens.push(rule.placeholder);
        return rule.syntheticValue;
      });
    }
  }

  // 2. Express / React Router colon parameters (e.g. /users/:id)
  result = result.replace(/:([a-zA-Z0-9_]+)/g, (_match, paramName) => {
    substitutedTokens.push(`:${paramName}`);
    return paramName.toLowerCase().includes('id') ? '1' : `test-${paramName}`;
  });

  return {
    synthesizedRoute: result,
    substitutedTokens,
  };
}
