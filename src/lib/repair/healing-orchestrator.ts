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
import { applyPatchAtomically } from './patch-applier.ts';
import { provePatchFix, type VerificationCheckRunner } from './patch-prover.ts';

export interface HealingRunResult {
  session: SelfHealingSession;
  converged: boolean;
  finalPatchDiff?: string;
  verifiedFiles: string[];
}

/**
 * Orchestrates multi-iteration autonomous self-healing loop.
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

      // 3. Policy Check
      const policyCheck = evaluateSelfHealingEligibility(proposal, config);
      if (!policyCheck.allowed) {
        log(`Policy blocked proposal: ${policyCheck.reasons.join('; ')}`);
        session.status = 'aborted';
        session.finalOutcome = 'policy_blocked';
        break;
      }

      // 4. Snapshot Workspace
      const snapshot = createWorkspaceSnapshot(workspace.workspacePath, proposal.affectedFiles, `iter_${iter}`);

      // 5. Apply Patch Atomically
      session.status = 'applying_patch';
      const applyResult = applyPatchAtomically(workspace.workspacePath, proposal.proposedChanges);
      if (!applyResult.success) {
        log(`Patch application failed: ${applyResult.conflictErrors.join('; ')}`);
        rollbackWorkspace(workspace.workspacePath, snapshot);
        continue;
      }

      // 6. Prove Patch Fix
      session.status = 'verifying_patch';
      const provingReport = await provePatchFix(
        proposal,
        workspace.workspacePath,
        testResult.name,
        adjacentCheckNames,
        runner
      );

      log(`Proving outcome: ${provingReport.outcome} (${provingReport.diagnostics})`);

      const iterRecord: SelfHealingIterationRecord = {
        iterationNumber: iter,
        proposalId: proposal.id,
        diffSummary: proposal.explanation,
        verificationStatus: provingReport.outcome === 'verified_fix' ? 'passed' : provingReport.outcome === 'regression_detected' ? 'regression' : 'failed',
        verificationDurationMs: provingReport.durationMs,
        failingChecksResolved: provingReport.failingCheckResolved ? [testResult.name] : [],
        newFailuresIntroduced: provingReport.regressionCheckResults.filter((r) => r.status === 'failed').map((r) => r.name),
        diagnostics: provingReport.diagnostics,
        timestamp: new Date().toISOString(),
      };
      session.iterations.push(iterRecord);

      if (provingReport.outcome === 'verified_fix') {
        converged = true;
        finalPatchDiff = proposal.proposedChanges;
        verifiedFiles.push(...applyResult.appliedFiles);
        session.status = 'completed';
        session.finalOutcome = 'verified_fix';
        log(`Convergence achieved on iteration ${iter}! Patch verified successfully.`);
        break;
      } else {
        // Rollback workspace for next iteration attempt
        log(`Reverting workspace to snapshot iter_${iter} for diagnostic refinement.`);
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
      log(`Self-healing exhausted all ${config.maxIterations} iterations without convergence.`);
    }
  } finally {
    if (workspace && converged === false) {
      // Clean up workspace if not converged
      await cleanupEphemeralWorkspace(workspace.workspacePath);
    }
    session.updatedAt = new Date().toISOString();
  }

  return {
    session,
    converged,
    finalPatchDiff,
    verifiedFiles,
  };
}
