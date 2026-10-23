/**
 * Recent Runs Entity Indexer for Command Palette
 *
 * Maps test run executions into searchable CommandAction records with
 * status badges, pass/fail counts, execution durations, and direct run view routing.
 */

import type { CommandAction } from '../types/navigation-palette.ts';
import type { RunIndexItem } from '../types/palette-indexing.ts';

export class RunIndexer {
  /**
   * Transforms a single test run into an indexed command action.
   */
  public static mapRunToCommandAction(run: RunIndexItem): CommandAction {
    const shortId = run.id.length > 8 ? run.id.slice(0, 8) : run.id;
    const projectDisplay = run.projectName || run.projectId;
    const durationSec = (run.durationMs / 1000).toFixed(1);

    const title = `Run #${shortId} • ${projectDisplay}`;
    const subtitle = `Branch ${run.branch} • ${run.passedCount}/${run.testCount} passed (${durationSec}s)`;

    const keywords: string[] = [
      run.id,
      shortId,
      run.branch,
      run.status,
      projectDisplay,
      'run',
      'test run',
      'execution',
    ];

    if (run.commitHash) {
      keywords.push(run.commitHash.slice(0, 7));
      keywords.push(run.commitHash);
    }

    return {
      id: `run-${run.id}`,
      title,
      subtitle,
      category: 'runs',
      href: `/projects/${run.projectId}/runs/${run.id}`,
      iconName: 'Play',
      keywords,
      badge: run.status.toUpperCase(),
      actionType: 'navigate',
      status: run.status,
      metadata: {
        runId: run.id,
        projectId: run.projectId,
        testCount: run.testCount,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        durationMs: run.durationMs,
        createdAt: run.createdAt,
      },
    };
  }

  /**
   * Batch converts run entities.
   */
  public static mapRuns(runs: RunIndexItem[]): CommandAction[] {
    return runs.map((r) => RunIndexer.mapRunToCommandAction(r));
  }
}
