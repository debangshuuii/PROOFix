/**
 * PROOFix CLI Watch Journey Mapper
 * Intelligently maps changed file paths to affected Playwright test journeys and benchmark scenarios.
 */

export interface MappedJourneyTarget {
  scenarioId: string;
  reason: string;
  matchedFile: string;
}

export class WatchJourneyMapper {
  public static mapFiles(changedFiles: string[]): MappedJourneyTarget[] {
    const targets: MappedJourneyTarget[] = [];
    const seenScenarios = new Set<string>();

    for (const file of changedFiles) {
      const lower = file.toLowerCase();

      // Rule 1: E-Commerce & Checkout Journey
      if (
        lower.includes('checkout') ||
        lower.includes('cart') ||
        lower.includes('ecommerce') ||
        lower.includes('order')
      ) {
        if (!seenScenarios.has('ecommerce_checkout')) {
          seenScenarios.add('ecommerce_checkout');
          targets.push({
            scenarioId: 'ecommerce_checkout',
            reason: 'Checkout form / cart route modified',
            matchedFile: file,
          });
        }
      }

      // Rule 2: Next.js SSR & Hydration Journey
      if (
        lower.includes('hydration') ||
        lower.includes('clock') ||
        lower.includes('timestamp') ||
        lower.includes('ssr')
      ) {
        if (!seenScenarios.has('hydration_mismatch')) {
          seenScenarios.add('hydration_mismatch');
          targets.push({
            scenarioId: 'hydration_mismatch',
            reason: 'Server/client clock or hydration component modified',
            matchedFile: file,
          });
        }
      }

      // Rule 3: Security & SQL Injection Journey
      if (
        lower.includes('sql') ||
        lower.includes('injection') ||
        lower.includes('search') ||
        lower.includes('query')
      ) {
        if (!seenScenarios.has('sql_injection_preflight')) {
          seenScenarios.add('sql_injection_preflight');
          targets.push({
            scenarioId: 'sql_injection_preflight',
            reason: 'Search query handler or database adapter modified',
            matchedFile: file,
          });
        }
      }
    }

    // Default fallback if no specific rule matched
    if (targets.length === 0 && changedFiles.length > 0) {
      targets.push({
        scenarioId: 'ecommerce_checkout',
        reason: 'General source change triggered baseline smoke journey',
        matchedFile: changedFiles[0],
      });
    }

    return targets;
  }
}
