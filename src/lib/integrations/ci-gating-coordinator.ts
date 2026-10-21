/**
 * Check Run Dispatcher & CI Gating Coordinator (Contribution 198)
 *
 * Coordinates Git webhook verification jobs, check run status transitions,
 * and automated pull request merge gating based on Playwright verification outcomes.
 */

import type {
  NormalizedGitEvent,
  GitIntegrationConfig,
  CheckRunPayload,
  PrReviewComment,
} from '../types/git-integrations.ts';
import {
  globalCheckRunFormatter,
} from './check-run-formatter.ts';
import type { TestExecutionResult } from './check-run-formatter.ts';
import { globalPrCommentSynthesizer } from './pr-comment-synthesizer.ts';

export interface CiGatingReport {
  eventId: string;
  provider: 'github' | 'gitlab';
  repository: string;
  commitSha: string;
  pullRequestNumber?: number;
  gatingStatus: 'passed' | 'blocked' | 'in_progress';
  checkRun: CheckRunPayload;
  reviewComment?: PrReviewComment;
  timestamp: string;
}

export class CiGatingCoordinator {
  private activeGatingReports: Map<string, CiGatingReport> = new Map();

  /**
   * Evaluates if this git event requires mandatory merge gating.
   */
  public shouldGateMerge(
    event: NormalizedGitEvent,
    config: GitIntegrationConfig
  ): boolean {
    if (!config.autoTriggerVerification) {
      return false;
    }
    return config.enabledEvents.includes(event.eventType);
  }

  /**
   * Initializes check run in 'queued' state and returns an orchestrated job ID.
   */
  public dispatchVerificationJob(
    event: NormalizedGitEvent,
    config: GitIntegrationConfig
  ): { jobId: string; status: 'queued'; gatingStatus: 'in_progress' } {
    const jobId = `ci-job-${event.provider}-${event.commitSha.substring(0, 8)}-${Date.now()}`;

    const initialCheckRun: CheckRunPayload = {
      name: 'PROOFix / PR Gating Verification',
      headSha: event.commitSha,
      status: 'queued',
      startedAt: new Date().toISOString(),
      output: {
        title: '⏳ Queued for Verification in Isolated Sandbox',
        summary: `Job ${jobId} enqueued for branch \`${event.branch}\` @ ${event.commitSha.substring(0, 7)}.`,
      },
    };

    this.activeGatingReports.set(event.commitSha, {
      eventId: event.id,
      provider: event.provider,
      repository: event.repository.fullName,
      commitSha: event.commitSha,
      pullRequestNumber: event.pullRequestNumber,
      gatingStatus: 'in_progress',
      checkRun: initialCheckRun,
      timestamp: new Date().toISOString(),
    });

    return { jobId, status: 'queued', gatingStatus: 'in_progress' };
  }

  /**
   * Processes the final test execution result, updates check run,
   * synthesizes PR healing comments if needed, and sets final gating status.
   */
  public processExecutionCompletion(
    event: NormalizedGitEvent,
    result: TestExecutionResult,
    config: GitIntegrationConfig
  ): CiGatingReport {
    const checkRun = globalCheckRunFormatter.formatCheckRun(result, {
      checkName: 'PROOFix / PR Gating Verification',
      detailsUrl: `https://proofix.dev/runs/${result.commitSha.substring(0, 8)}`,
      externalId: event.id,
    });

    const isPassed = result.failedCount === 0;
    const gatingStatus = isPassed ? 'passed' : 'blocked';

    let reviewComment: PrReviewComment | undefined;
    if (event.pullRequestNumber && config.autoCommentHealingPr) {
      const topFailure = result.failures && result.failures.length > 0 ? result.failures[0] : undefined;

      reviewComment = globalPrCommentSynthesizer.synthesizeComment({
        pullRequestNumber: event.pullRequestNumber,
        commitSha: event.commitSha,
        repoFullName: event.repository.fullName,
        testTitle: topFailure ? topFailure.title : result.suiteName,
        filePath: topFailure ? topFailure.filePath : 'tests/e2e.spec.ts',
        brokenSelector: topFailure ? 'button.broken-selector' : undefined,
        suggestedSelector: topFailure ? 'button[data-testid="healed"]' : undefined,
        originalSnippet: topFailure?.diffSnippet?.split('\n')[0]?.replace(/^[-+]/, '') || undefined,
        healedSnippet: topFailure?.diffSnippet?.split('\n')[1]?.replace(/^[-+]/, '') || undefined,
        explanation: topFailure ? topFailure.errorMessage : 'Verification suite completed with zero regressions.',
        healingConfidence: isPassed ? 1.0 : 0.94,
        verificationPassed: isPassed,
      });
    }

    const report: CiGatingReport = {
      eventId: event.id,
      provider: event.provider,
      repository: event.repository.fullName,
      commitSha: event.commitSha,
      pullRequestNumber: event.pullRequestNumber,
      gatingStatus,
      checkRun,
      reviewComment,
      timestamp: new Date().toISOString(),
    };

    this.activeGatingReports.set(event.commitSha, report);
    return report;
  }

  /**
   * Retrieves current gating status for a commit.
   */
  public getGatingReport(commitSha: string): CiGatingReport | undefined {
    return this.activeGatingReports.get(commitSha);
  }

  /**
   * Lists all gating reports.
   */
  public listAllReports(): CiGatingReport[] {
    return Array.from(this.activeGatingReports.values());
  }
}

export const globalCiGatingCoordinator = new CiGatingCoordinator();
