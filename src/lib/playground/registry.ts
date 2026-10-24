/**
 * Interactive Demo Scenario Registry
 *
 * Central catalog providing indexing, search, filtering, and retrieval
 * of all zero-setup interactive verification scenarios.
 */

import type { DemoScenarioContract, DemoScenarioId, DemoScenarioCategory } from './types.ts';
import { ECOMMERCE_CHECKOUT_SCENARIO } from './scenarios/ecommerce-checkout.ts';
import { HYDRATION_MISMATCH_SCENARIO } from './scenarios/hydration-mismatch.ts';
import { SQL_INJECTION_PREFLIGHT_SCENARIO } from './scenarios/sql-injection-preflight.ts';

export const ALL_DEMO_SCENARIOS: DemoScenarioContract[] = [
  ECOMMERCE_CHECKOUT_SCENARIO,
  HYDRATION_MISMATCH_SCENARIO,
  SQL_INJECTION_PREFLIGHT_SCENARIO,
];

const SCENARIO_MAP: Record<DemoScenarioId, DemoScenarioContract> = {
  ecommerce_checkout: ECOMMERCE_CHECKOUT_SCENARIO,
  hydration_mismatch: HYDRATION_MISMATCH_SCENARIO,
  sql_injection_preflight: SQL_INJECTION_PREFLIGHT_SCENARIO,
};

export class ScenarioRegistry {
  /**
   * Retrieve all registered scenarios, optionally filtered by category and query
   */
  static listScenarios(
    category?: DemoScenarioCategory | 'all',
    searchQuery?: string
  ): DemoScenarioContract[] {
    let list = [...ALL_DEMO_SCENARIOS];

    if (category && category !== 'all') {
      list = list.filter((s) => s.category === category);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.subtitle.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.fault.headline.toLowerCase().includes(q)
      );
    }

    return list;
  }

  /**
   * Retrieve a specific scenario by identifier
   */
  static getScenarioById(id: DemoScenarioId | string): DemoScenarioContract | null {
    return SCENARIO_MAP[id as DemoScenarioId] || null;
  }

  /**
   * Get all scenario identifiers
   */
  static getScenarioIds(): DemoScenarioId[] {
    return Object.keys(SCENARIO_MAP) as DemoScenarioId[];
  }

  /**
   * Verify if scenario ID exists in registry
   */
  static hasScenario(id: string): boolean {
    return id in SCENARIO_MAP;
  }
}
