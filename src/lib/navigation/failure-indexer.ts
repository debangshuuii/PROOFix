/**
 * Failing Tests Entity Indexer for Command Palette
 *
 * Indexes failing Playwright test specs, assertion errors, and stack traces
 * so engineers can jump straight from Cmd+K to the failing step/diff.
 */

import type { CommandAction } from '../types/navigation-palette.ts';
import type { FailingTestIndexItem } from '../types/palette-indexing.ts';

export class FailureIndexer {
  /**
   * Transforms a single failing test finding into an indexed command action.
   */
  public static mapFailureToCommandAction(failure: FailingTestIndexItem): CommandAction {
    const projectDisplay = failure.projectName || failure.projectId;
    const cleanError = failure.errorMessage.replace(/\s+/g, ' ').trim();
    const truncatedError = cleanError.length > 70 ? `${cleanError.slice(0, 70)}...` : cleanError;

    const title = `Failing Test: ${failure.testName}`;
    const subtitle = `${projectDisplay} • ${truncatedError}`;

    const keywords: string[] = [
      failure.testName,
      'failure',
      'failing test',
      'error',
      'broken',
      'assertion',
      projectDisplay,
      failure.runId,
    ];

    if (failure.suiteName) {
      keywords.push(failure.suiteName);
    }

    // Extract key tokens from error message (e.g. locator, timeout, expected vs received)
    const errorWords = cleanError
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((w) => w.length > 3)
      .slice(0, 12);
    keywords.push(...errorWords);

    if (cleanError.toLowerCase().includes('timed out') || cleanError.toLowerCase().includes('timeout')) {
      keywords.push('timeout', 'timed out');
    }

    return {
      id: `failure-${failure.id}`,
      title,
      subtitle,
      category: 'failures',
      href: `/projects/${failure.projectId}/runs/${failure.runId}?tab=failures`,
      iconName: 'Flame',
      keywords,
      badge: 'FAILING TEST',
      actionType: 'navigate',
      status: 'failed',
      metadata: {
        failureId: failure.id,
        runId: failure.runId,
        projectId: failure.projectId,
        durationMs: failure.durationMs,
        failedAt: failure.failedAt,
      },
    };
  }

  /**
   * Batch converts failing test entities.
   */
  public static mapFailures(failures: FailingTestIndexItem[]): CommandAction[] {
    return failures.map((f) => FailureIndexer.mapFailureToCommandAction(f));
  }
}
