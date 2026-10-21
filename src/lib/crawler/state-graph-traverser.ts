/**
 * Autonomous State Graph & Cycle Detection Traversal Engine (Contribution 224)
 *
 * Models web application navigation as a directed multigraph G = (V, E) of UI states,
 * computing deterministic state hashes, cycle detection, and shortest-path anomaly reproduction.
 */

import crypto from 'crypto';
import type {
  StateGraphNode,
  StateGraphEdge,
  CrawlerAction,
} from '../types/chaos-crawler.ts';
import type { DiscoveredElement } from './dom-element-discoverer.ts';

export class StateGraphTraverser {
  private nodes: Map<string, StateGraphNode> = new Map();
  private edges: StateGraphEdge[] = [];
  private visitedStateCounts: Map<string, number> = new Map();
  private rootNodeId?: string;

  /**
   * Computes a deterministic state hash from URL and interactive element signatures.
   */
  public computeStateHash(url: string, elements: DiscoveredElement[]): string {
    const normUrl = url.split('#')[0].replace(/\/$/, '');
    const sigs = elements
      .map((e) => `${e.type}:${e.selector}:${e.text}`)
      .sort()
      .join('|');

    return crypto
      .createHash('sha256')
      .update(`${normUrl}::${sigs}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Registers a discovered UI state node in the graph.
   */
  public registerNode(
    url: string,
    title: string,
    elements: DiscoveredElement[],
    depth: number
  ): StateGraphNode {
    const id = this.computeStateHash(url, elements);
    const existing = this.nodes.get(id);

    if (!this.rootNodeId) {
      this.rootNodeId = id;
    }

    const currentVisits = (this.visitedStateCounts.get(id) || 0) + 1;
    this.visitedStateCounts.set(id, currentVisits);

    if (existing) {
      existing.visitedCount = currentVisits;
      return existing;
    }

    const newNode: StateGraphNode = {
      id,
      url,
      title: title || url,
      depth,
      interactiveElementsCount: elements.length,
      visitedCount: 1,
      anomaliesDetected: [],
      firstSeenAt: new Date().toISOString(),
    };

    this.nodes.set(id, newNode);
    return newNode;
  }

  /**
   * Records a directed action edge between two states.
   */
  public recordTransition(
    fromNodeId: string,
    toNodeId: string,
    action: CrawlerAction,
    durationMs: number = 0
  ): StateGraphEdge {
    const edge: StateGraphEdge = {
      fromNodeId,
      toNodeId,
      action,
      durationMs,
    };
    this.edges.push(edge);
    return edge;
  }

  /**
   * Evaluates if a state has been excessively visited (cycle trap).
   */
  public isCycleTrap(stateHash: string, maxVisitsPerState: number = 3): boolean {
    const count = this.visitedStateCounts.get(stateHash) || 0;
    return count >= maxVisitsPerState;
  }

  /**
   * Computes the shortest action sequence to reach targetNodeId from root using BFS.
   */
  public getShortestPathToNode(targetNodeId: string): CrawlerAction[] {
    if (!this.rootNodeId || targetNodeId === this.rootNodeId) {
      return [];
    }

    // BFS Queue: [currentNodeId, pathOfActions]
    const queue: Array<[string, CrawlerAction[]]> = [[this.rootNodeId, []]];
    const visited = new Set<string>([this.rootNodeId]);

    while (queue.length > 0) {
      const [currentId, path] = queue.shift()!;

      if (currentId === targetNodeId) {
        return path;
      }

      // Outbound edges from currentId
      const outbound = this.edges.filter((e) => e.fromNodeId === currentId);
      for (const edge of outbound) {
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          queue.push([edge.toNodeId, [...path, edge.action]]);
        }
      }
    }

    return []; // No path found
  }

  public getNodes(): StateGraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): StateGraphEdge[] {
    return [...this.edges];
  }

  public getGraphSummary(): {
    nodeCount: number;
    edgeCount: number;
    maxDepthReached: number;
  } {
    let maxDepth = 0;
    for (const node of this.nodes.values()) {
      if (node.depth > maxDepth) maxDepth = node.depth;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      maxDepthReached: maxDepth,
    };
  }

  public clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.visitedStateCounts.clear();
    this.rootNodeId = undefined;
  }
}

export const globalStateGraphTraverser = new StateGraphTraverser();
