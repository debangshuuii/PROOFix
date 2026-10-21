/**
 * Autonomous Exploratory "Chaos Monkey" AI Crawler Types (Contribution 221)
 *
 * Defines types for autonomous vision-guided crawling, state graph exploration,
 * adversarial edge-case fuzzing, and zero-day anomaly detection.
 */

export type CrawlerActionType =
  | 'navigate'
  | 'click'
  | 'fill_random_payload'
  | 'hover_menu'
  | 'press_key'
  | 'scroll_viewport'
  | 'trigger_resize';

export interface CrawlerAction {
  type: CrawlerActionType;
  selector?: string;
  targetUrl?: string;
  payload?: string | number | boolean;
  coordinates?: { x: number; y: number };
  rationale: string;
}

export type ChaosAnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

export type AnomalyType =
  | 'uncaught_exception' // window.onerror
  | 'unhandled_rejection' // window.onunhandledrejection
  | 'http_server_error' // 500, 502, 504
  | 'layout_overflow' // scrollWidth > clientWidth
  | 'ui_freeze_hang' // event loop blocked > threshold
  | 'broken_link_404'; // Dead navigation link

export interface CrawlerAnomaly {
  id: string;
  type: AnomalyType;
  severity: ChaosAnomalySeverity;
  message: string;
  url: string;
  stateHash: string;
  actionTriggered: CrawlerAction;
  screenshotPath?: string;
  stackTrace?: string;
  timestamp: string;
}

export interface StateGraphNode {
  id: string; // state hash
  url: string;
  title: string;
  depth: number;
  interactiveElementsCount: number;
  visitedCount: number;
  anomaliesDetected: CrawlerAnomaly[];
  firstSeenAt: string;
}

export interface StateGraphEdge {
  fromNodeId: string;
  toNodeId: string;
  action: CrawlerAction;
  durationMs: number;
}

export interface ChaosCrawlerConfig {
  seedUrl: string;
  maxDepth: number;
  maxPages: number;
  maxDurationSecs: number;
  randomPayloadsEnabled: boolean;
  exploratoryPatienceMs: number; // delay between actions
  viewportWidth: number;
  viewportHeight: number;
  respectRobotsTxt: boolean;
  allowedDomains: string[];
}

export interface ChaosCrawlReport {
  sessionId: string;
  seedUrl: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  totalNodesExplored: number;
  totalActionsExecuted: number;
  anomalies: CrawlerAnomaly[];
  graphNodes: StateGraphNode[];
  graphEdges: StateGraphEdge[];
  durationMs: number;
  startedAt: string;
  completedAt?: string;
}
