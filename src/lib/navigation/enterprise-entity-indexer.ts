/**
 * Composite Enterprise Entity Indexer for Command Palette
 *
 * Coordinates dynamic ingestion and lifecycle of projects, runs,
 * failing test cases, and fix proposals into unified CommandAction collections.
 */

import type { CommandAction, NavigationCategory } from '../types/navigation-palette';
import type {
  EntityIndexBundle,
  ProjectIndexItem,
  RunIndexItem,
  FailingTestIndexItem,
  ProposalIndexItem,
} from '../types/palette-indexing';
import { ProjectIndexer } from './project-indexer';
import { RunIndexer } from './run-indexer';
import { FailureIndexer } from './failure-indexer';
import { ProposalIndexer } from './proposal-indexer';

export class EnterpriseEntityIndexer {
  private projectsMap: Map<string, CommandAction> = new Map();
  private runsMap: Map<string, CommandAction> = new Map();
  private failuresMap: Map<string, CommandAction> = new Map();
  private proposalsMap: Map<string, CommandAction> = new Map();

  /**
   * Ingests active projects into the dynamic index.
   */
  public indexProjects(projects: ProjectIndexItem[]): void {
    this.projectsMap.clear();
    for (const project of projects) {
      const action = ProjectIndexer.mapProjectToCommandAction(project);
      this.projectsMap.set(action.id, action);
    }
  }

  /**
   * Ingests recent test runs into the dynamic index.
   */
  public indexRuns(runs: RunIndexItem[]): void {
    this.runsMap.clear();
    for (const run of runs) {
      const action = RunIndexer.mapRunToCommandAction(run);
      this.runsMap.set(action.id, action);
    }
  }

  /**
   * Ingests failing test findings into the dynamic index.
   */
  public indexFailures(failures: FailingTestIndexItem[]): void {
    this.failuresMap.clear();
    for (const failure of failures) {
      const action = FailureIndexer.mapFailureToCommandAction(failure);
      this.failuresMap.set(action.id, action);
    }
  }

  /**
   * Ingests AI remediation proposals into the dynamic index.
   */
  public indexProposals(proposals: ProposalIndexItem[]): void {
    this.proposalsMap.clear();
    for (const proposal of proposals) {
      const action = ProposalIndexer.mapProposalToCommandAction(proposal);
      this.proposalsMap.set(action.id, action);
    }
  }

  /**
   * Atomic batch ingestion of all entity types simultaneously.
   */
  public indexBundle(bundle: EntityIndexBundle): void {
    this.indexProjects(bundle.projects);
    this.indexRuns(bundle.runs);
    this.indexFailures(bundle.failingTests);
    this.indexProposals(bundle.proposals);
  }

  /**
   * Returns all dynamic actions across all 4 entity categories.
   */
  public getAllActions(): CommandAction[] {
    return [
      ...Array.from(this.projectsMap.values()),
      ...Array.from(this.runsMap.values()),
      ...Array.from(this.failuresMap.values()),
      ...Array.from(this.proposalsMap.values()),
    ];
  }

  /**
   * Returns dynamic actions for a specific entity category.
   */
  public getActionsByCategory(category: NavigationCategory): CommandAction[] {
    switch (category) {
      case 'projects':
        return Array.from(this.projectsMap.values());
      case 'runs':
        return Array.from(this.runsMap.values());
      case 'failures':
        return Array.from(this.failuresMap.values());
      case 'proposals':
        return Array.from(this.proposalsMap.values());
      default:
        return [];
    }
  }

  /**
   * Returns entity count breakdown.
   */
  public getCounts(): Record<'projects' | 'runs' | 'failures' | 'proposals' | 'total', number> {
    const projects = this.projectsMap.size;
    const runs = this.runsMap.size;
    const failures = this.failuresMap.size;
    const proposals = this.proposalsMap.size;
    return {
      projects,
      runs,
      failures,
      proposals,
      total: projects + runs + failures + proposals,
    };
  }

  /**
   * Clears all dynamic caches.
   */
  public clear(): void {
    this.projectsMap.clear();
    this.runsMap.clear();
    this.failuresMap.clear();
    this.proposalsMap.clear();
  }
}
