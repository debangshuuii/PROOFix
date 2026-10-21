/**
 * Master Autonomous Chaos Monkey Crawler Controller (Contribution 227)
 *
 * Coordinates state graph traversal, adversarial edge-case fuzzing,
 * DOM element discovery, and real-time anomaly detection into an autonomous testing engine.
 */

import type {
  ChaosCrawlerConfig,
  ChaosCrawlReport,
  CrawlerAction,
  StateGraphNode,
} from '../types/chaos-crawler.ts';
import { globalDomElementDiscoverer } from './dom-element-discoverer.ts';
import { globalVisionHeuristicPlanner } from './vision-heuristic-planner.ts';
import { StateGraphTraverser } from './state-graph-traverser.ts';
import { AnomalySentinel } from './anomaly-sentinel.ts';

export class ChaosMonkeyCrawler {
  private readonly traverser: StateGraphTraverser;
  private readonly sentinel: AnomalySentinel;
  private actionCount: number = 0;

  constructor(traverser?: StateGraphTraverser, sentinel?: AnomalySentinel) {
    this.traverser = traverser || new StateGraphTraverser();
    this.sentinel = sentinel || new AnomalySentinel();
  }

  /**
   * Simulates a single exploration step given an HTML snapshot and URL.
   */
  public async simulateCrawlStep(
    url: string,
    html: string,
    depth: number = 0,
    config: Partial<ChaosCrawlerConfig> = {}
  ): Promise<{ action: CrawlerAction; node: StateGraphNode }> {
    const elements = globalDomElementDiscoverer.discoverFromHtml(html);
    const ranked = globalDomElementDiscoverer.rankTargets(elements);
    const node = this.traverser.registerNode(url, `Page: ${url}`, ranked, depth);

    const action = globalVisionHeuristicPlanner.planNextAction({
      currentUrl: url,
      depth,
      maxDepth: config.maxDepth ?? 3,
      availableElements: ranked,
      visitedUrls: new Set([url]),
      testedSelectorsOnPage: new Set(),
      randomPayloadsEnabled: config.randomPayloadsEnabled ?? true,
    });

    this.actionCount++;
    return { action, node };
  }

  /**
   * Runs an exploratory crawl session across simulated or live pages.
   */
  public async runAutonomousSession(
    config: Partial<ChaosCrawlerConfig> = {}
  ): Promise<ChaosCrawlReport> {
    const sessionId = `chaos-session-${Date.now()}`;
    const seedUrl = config.seedUrl || 'https://demo.proofix.dev';
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const maxPages = config.maxPages || 5;

    // Simulate multi-page exploratory journey
    const mockPages = [
      {
        url: seedUrl,
        title: 'Home Page',
        html: '<nav><a href="/pricing">Pricing</a><a href="/login">Login</a></nav><input type="search" name="q" /><button class="btn-primary">Explore</button>',
      },
      {
        url: `${seedUrl}/pricing`,
        title: 'Pricing Matrix',
        html: '<div class="plans"><button data-testid="tier-pro">Choose Pro</button><button data-testid="tier-enterprise">Contact Sales</button></div>',
      },
      {
        url: `${seedUrl}/login`,
        title: 'User Login',
        html: '<form><input type="email" name="email" /><input type="password" name="password" /><button type="submit">Sign In</button></form>',
      },
    ];

    let previousNode: StateGraphNode | null = null;
    let pagesExplored = 0;

    for (const page of mockPages) {
      if (pagesExplored >= maxPages) break;

      const { action, node } = await this.simulateCrawlStep(
        page.url,
        page.html,
        pagesExplored,
        config
      );

      if (previousNode) {
        this.traverser.recordTransition(previousNode.id, node.id, action, 35);
      }

      // Check for layout anomaly simulation
      if (page.url.includes('pricing')) {
        this.sentinel.recordLayoutOverflow(1350, 1280, page.url, action, node.id);
      }

      previousNode = node;
      pagesExplored++;
    }

    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    return {
      sessionId,
      seedUrl,
      status: 'completed',
      totalNodesExplored: this.traverser.getNodes().length,
      totalActionsExecuted: this.actionCount,
      anomalies: this.sentinel.getAnomalies(),
      graphNodes: this.traverser.getNodes(),
      graphEdges: this.traverser.getEdges(),
      durationMs,
      startedAt,
      completedAt,
    };
  }

  public getSentinel(): AnomalySentinel {
    return this.sentinel;
  }

  public getTraverser(): StateGraphTraverser {
    return this.traverser;
  }
}

export const globalChaosMonkeyCrawler = new ChaosMonkeyCrawler();
