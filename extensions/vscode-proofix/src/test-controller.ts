import { RouteHandlerInfo } from './types';

export type TestRunProfileKind = 'run' | 'prove' | 'debug';

export interface TestRunProfile {
  label: string;
  kind: TestRunProfileKind;
  isDefault: boolean;
}

export interface TestItemNode {
  id: string;
  label: string;
  uri?: string;
  children: Map<string, TestItemNode>;
  parent?: TestItemNode;
  status?: 'passed' | 'failed' | 'running' | 'enqueued';
  error?: string;
  durationMs?: number;
}

/**
 * Manages the native VS Code Test Controller hierarchy for PROOFix routes and user journeys.
 */
export class ProofixTestController {
  public rootTests = new Map<string, TestItemNode>();

  public createOrGetNode(id: string, label: string, uri?: string, parent?: TestItemNode): TestItemNode {
    const node: TestItemNode = {
      id,
      label,
      uri,
      children: new Map(),
      parent,
      status: 'enqueued',
    };

    if (parent) {
      parent.children.set(id, node);
    } else {
      this.rootTests.set(id, node);
    }

    return node;
  }

  public populateFromRoutes(routes: RouteHandlerInfo[]): void {
    this.rootTests.clear();

    const projectNode = this.createOrGetNode('project_root', 'PROOFix Verification Workspace');

    for (const r of routes) {
      const categoryLabel = r.isApi ? 'API Routes' : 'Page Routes';
      let catNode = projectNode.children.get(categoryLabel);
      if (!catNode) {
        catNode = this.createOrGetNode(categoryLabel, categoryLabel, undefined, projectNode);
      }

      const routeNode = this.createOrGetNode(
        `route:${r.routePath}`,
        `${r.routePath} (${r.exportName || 'default'})`,
        r.filePath,
        catNode
      );

      // Pre-seed default journeys for route
      this.createOrGetNode(
        `journey:${r.routePath}:smoke`,
        'Smoke & HTTP Health Check',
        r.filePath,
        routeNode
      );
      this.createOrGetNode(
        `journey:${r.routePath}:interactive`,
        'Interactive DOM & Hydration Check',
        r.filePath,
        routeNode
      );
    }
  }

  public getNodeById(id: string): TestItemNode | undefined {
    return this.findRecursive(this.rootTests, id);
  }

  private findRecursive(map: Map<string, TestItemNode>, targetId: string): TestItemNode | undefined {
    for (const [id, node] of map.entries()) {
      if (id === targetId) return node;
      const found = this.findRecursive(node.children, targetId);
      if (found) return found;
    }
    return undefined;
  }

  public countAllTests(): number {
    let count = 0;
    const countNodes = (map: Map<string, TestItemNode>) => {
      for (const node of map.values()) {
        if (node.children.size === 0) {
          count++;
        } else {
          countNodes(node.children);
        }
      }
    };
    countNodes(this.rootTests);
    return count;
  }

  public getAllLeafJourneys(): TestItemNode[] {
    const leaves: TestItemNode[] = [];
    const collect = (map: Map<string, TestItemNode>) => {
      for (const node of map.values()) {
        if (node.children.size === 0) {
          leaves.push(node);
        } else {
          collect(node.children);
        }
      }
    };
    collect(this.rootTests);
    return leaves;
  }
}
