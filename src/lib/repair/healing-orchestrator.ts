import type {
  SelfHealingConfig,
  SelfHealingSession,
  SelfHealingIterationRecord,
} from '../types/self-healing.ts';
import type { TestResult } from '../types/index.ts';
import { getDefaultSelfHealingConfig, evaluateSelfHealingEligibility } from './self-healing-policy.ts';
import { synthesizeFailureContext } from './context-synthesizer.ts';
import { generateSurgicalPatch } from './patch-generator.ts';
import {
  createEphemeralWorkspace,
  createWorkspaceSnapshot,
  rollbackWorkspace,
  cleanupEphemeralWorkspace,
  type EphemeralWorkspace,
} from './ephemeral-workspace.ts';
import { applyPatchWithJournal } from './atomic-patch-applier.ts';
import { rollbackTransaction } from './rollback-manager.ts';
import { proveCandidatePatch, type VerificationCheckRunner } from './patch-prover.ts';
import { evaluateSelfHealingGate, recordHealingAttempt } from './policy-gatekeeper.ts';
import { publishSelfHealingPullRequest } from './github-publisher.ts';
import type { PatchTransactionJournal } from '../types/patch-transaction.ts';

export interface HealingRunResult {
  session: SelfHealingSession;
  converged: boolean;
  finalPatchDiff?: string;
  verifiedFiles: string[];
  journal?: PatchTransactionJournal;
}

/**
 * Orchestrates multi-iteration autonomous self-healing loop with AST verification,
 * policy gatekeeping, and rollback journal recovery.
 */
export async function runSelfHealingLoop(
  testResult: TestResult,
  sourcePath: string,
  projectId: string,
  runId: string,
  commitSha: string,
  adjacentCheckNames: string[],
  runner: VerificationCheckRunner,
  customConfig: Partial<SelfHealingConfig> = {}
): Promise<HealingRunResult> {
  const config: SelfHealingConfig = {
    ...getDefaultSelfHealingConfig(),
    ...customConfig,
  };

  const sessionId = `heal_${Date.now()}`;
  const session: SelfHealingSession = {
    id: sessionId,
    runId,
    projectId,
    failureId: testResult.id,
    status: 'initializing',
    currentIteration: 0,
    maxIterations: config.maxIterations,
    config,
    iterations: [],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const log = (msg: string) => {
    session.logs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  log(`Starting self-healing loop for test "${testResult.name}" (mode: ${config.mode}, max iterations: ${config.maxIterations})`);

  let workspace: EphemeralWorkspace | null = null;
  let converged = false;
  let finalPatchDiff: string | undefined = undefined;
  let lastJournal: PatchTransactionJournal | undefined = undefined;
  const verifiedFiles: string[] = [];

  try {
    session.status = 'sandboxing';
    workspace = await createEphemeralWorkspace(sourcePath, sessionId);
    session.activeWorkspacePath = workspace.workspacePath;
    log(`Sandbox workspace provisioned at ${workspace.workspacePath}`);

    let currentFailureResult = { ...testResult };

    for (let iter = 1; iter <= config.maxIterations; iter++) {
      session.currentIteration = iter;
      log(`=== Beginning Iteration ${iter}/${config.maxIterations} ===`);

      // 1. Synthesize Context
      session.status = 'synthesizing_context';
      const failureCtx = synthesizeFailureContext(currentFailureResult, workspace.workspacePath);

      // 2. Generate Surgical Patch
      session.status = 'generating_patch';
      const proposal = generateSurgicalPatch(failureCtx, projectId, runId, commitSha);
      log(`Generated proposal ${proposal.id} (confidence: ${proposal.confidenceScore}%)`);

      // 3. Evaluate Policy & Risk Gatekeeper
      const gateResult = evaluateSelfHealingGate({
        projectId,
        diffText: proposal.proposedChanges,
        confidenceScore: proposal.confidenceScore,
        mode: config.mode,
      });

      if (gateResult.permitAction === 'blocked') {
        log(`Gatekeeper blocked patch: ${gateResult.rateLimitStatus.reason || 'Rate limit or policy violation'}`);
        session.status = 'aborted';
        session.finalOutcome = 'policy_blocked';
        break;
      }

      const policyCheck = evaluateSelfHealingEligibility(proposal, config);
      if (!policyCheck.allowed) {
        log(`Policy blocked proposal: ${policyCheck.reasons.join('; ')}`);
        session.status = 'aborted';
        session.finalOutcome = 'policy_blocked';
        break;
      }

      // 4. Snapshot Workspace
      const snapshot = createWorkspaceSnapshot(workspace.workspacePath, proposal.affectedFiles, `iter_${iter}`);

      // 5. Apply Patch Atomically with Transaction Journal
      session.status = 'applying_patch';
      const applyResult = await applyPatchWithJournal({
        workspacePath: workspace.workspacePath,
        diffText: proposal.proposedChanges,
        proposalId: proposal.id,
      });

      lastJournal = applyResult.journal;

      if (!applyResult.success) {
        log(`Patch application failed: ${applyResult.error}`);
        rollbackWorkspace(workspace.workspacePath, snapshot);
        continue;
      }

      // 6. Prove Patch Fix in Isolated Workspace
      session.status = 'verifying_patch';
      const provingReport = await proveCandidatePatch({
        proposal,
        workspacePath: workspace.workspacePath,
        targetCheckName: testResult.name,
        regressionCheckNames: adjacentCheckNames,
        runner,
      });

      log(`Proving outcome: ${provingReport.outcome} (${provingReport.diagnostics})`);

      const iterRecord: SelfHealingIterationRecord = {
        iterationNumber: iter,
        proposalId: proposal.id,
        diffSummary: proposal.explanation,
        verificationStatus:
          provingReport.outcome === 'verified_fix'
            ? 'passed'
            : provingReport.outcome === 'regression_detected'
            ? 'regression'
            : 'failed',
        verificationDurationMs: provingReport.durationMs,
        failingChecksResolved: provingReport.failingCheckResolved ? [testResult.name] : [],
        newFailuresIntroduced: provingReport.regressionCheckResults
          .filter((r) => r.passed === false || r.status === 'failed')
          .map((r) => r.name),
        diagnostics: provingReport.diagnostics,
        timestamp: new Date().toISOString(),
      };
      session.iterations.push(iterRecord);

      if (provingReport.outcome === 'verified_fix') {
        converged = true;
        finalPatchDiff = proposal.proposedChanges;
        verifiedFiles.push(...applyResult.modifiedFiles, ...applyResult.createdFiles);
        session.status = 'completed';
        session.finalOutcome = 'verified_fix';
        recordHealingAttempt(projectId, 'success');
        log(`Convergence achieved on iteration ${iter}! Patch verified successfully.`);

        // 7. Auto-Publish Pull Request if fully autonomous mode
        if (config.mode === 'fully_autonomous' && config.createDraftPullRequest) {
          session.status = 'publishing_pr';
          log('Publishing automated verified fix Pull Request to GitHub repository...');
          const prResult = await publishSelfHealingPullRequest(
            session,
            proposal,
            {
              repoOwner: 'debangshuuii',
              repoName: 'PROOFix',
            },
            provingReport
          );

          if (prResult.success) {
            session.pullRequestUrl = prResult.pullRequestUrl;
            session.pullRequestNumber = prResult.pullRequestNumber;
            session.gitBranch = prResult.branchName;
            log(`Pull request successfully created: ${prResult.pullRequestUrl}`);
          } else {
            log(`Note: Pull request could not be opened automatically: ${prResult.error}`);
          }
        }

        break;
      } else {
        // Rollback workspace for next iteration attempt
        log(`Reverting workspace for next iteration refinement.`);
        await rollbackTransaction(applyResult.journal, 'Verification failed in iteration attempt');
        rollbackWorkspace(workspace.workspacePath, snapshot);

        // Feed back diagnostic failure info into currentFailureResult for next iteration
        currentFailureResult = {
          ...currentFailureResult,
          errorDetails: {
            ...currentFailureResult.errorDetails,
            message: provingReport.diagnostics,
          },
        };
      }
    }

    if (!converged && session.status !== 'aborted') {
      session.status = 'failed';
      session.finalOutcome = 'unfixable';
      recordHealingAttempt(projectId, 'failure');
      log(`Self-healing exhausted all ${config.maxIterations} iterations without convergence.`);
    }
  } finally {
    if (workspace && converged === false) {
      await cleanupEphemeralWorkspace(workspace.workspacePath);
    }
    session.updatedAt = new Date().toISOString();
  }

  return {
    session,
    converged,
    finalPatchDiff,
    verifiedFiles,
    journal: lastJournal,
  };
}
