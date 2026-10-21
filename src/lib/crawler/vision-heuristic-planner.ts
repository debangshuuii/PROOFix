/**
 * Vision-Guided Heuristic Exploration Planner (Contribution 226)
 *
 * Autonomously selects the highest-yield exploratory action (navigate, fuzz input, click menu)
 * based on visual hierarchy, DOM cues, and state novelty.
 */

import type { CrawlerAction } from '../types/chaos-crawler.ts';
import type { DiscoveredElement } from './dom-element-discoverer.ts';
import { globalPayloadGenerator } from './adversarial-payloads.ts';

export interface ExplorationContext {
  currentUrl: string;
  depth: number;
  maxDepth: number;
  availableElements: DiscoveredElement[];
  visitedUrls: Set<string>;
  testedSelectorsOnPage: Set<string>;
  randomPayloadsEnabled: boolean;
}

export class VisionHeuristicPlanner {
  /**
   * Plans the next optimal action to discover unhandled edge cases or unexplored routes.
   */
  public planNextAction(context: ExplorationContext): CrawlerAction {
    const unvisitedElements = context.availableElements.filter(
      (e) => !context.testedSelectorsOnPage.has(e.selector)
    );

    // 1. If untargeted form inputs exist, fuzz them with adversarial payloads
    if (context.randomPayloadsEnabled) {
      const input = unvisitedElements.find((e) => e.type === 'input');
      if (input) {
        const payload = globalPayloadGenerator.getRandomPayload();
        return {
          type: 'fill_random_payload',
          selector: input.selector,
          payload,
          rationale: `Fuzzing input field '${input.text || input.selector}' with adversarial payload to test server-side sanitization.`,
        };
      }
    }

    // 2. If unvisited navigation links exist and depth < maxDepth, navigate to expand frontier
    if (context.depth < context.maxDepth) {
      const unvisitedLink = unvisitedElements.find(
        (e) => e.type === 'link' && e.href && !context.visitedUrls.has(e.href)
      );

      if (unvisitedLink && unvisitedLink.href) {
        return {
          type: 'click',
          selector: unvisitedLink.selector,
          targetUrl: unvisitedLink.href,
          rationale: `Navigating to unvisited route '${unvisitedLink.href}' to broaden state graph exploration.`,
        };
      }
    }

    // 3. If buttons or interactive toggles exist, click them to uncover modals / drawers
    const nonDestructiveButton = unvisitedElements.find(
      (e) => e.type === 'button' && !e.isDestructive
    );

    if (nonDestructiveButton) {
      return {
        type: 'click',
        selector: nonDestructiveButton.selector,
        rationale: `Interacting with button '${nonDestructiveButton.text}' to test UI state transitions and error handlers.`,
      };
    }

    // 4. Any remaining interactive link
    const anyLink = unvisitedElements.find((e) => e.type === 'link');
    if (anyLink) {
      return {
        type: 'click',
        selector: anyLink.selector,
        targetUrl: anyLink.href,
        rationale: `Following link '${anyLink.text}' to test route stability.`,
      };
    }

    // 5. Fallback: scroll viewport to trigger lazy loading / scroll listeners
    return {
      type: 'scroll_viewport',
      coordinates: { x: 0, y: 500 },
      rationale: 'Scrolling viewport downwards to trigger infinite-scroll or lazy-loaded components.',
    };
  }
}

export const globalVisionHeuristicPlanner = new VisionHeuristicPlanner();
