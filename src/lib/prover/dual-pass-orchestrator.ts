import { ProverExecutionRequest, ProverExecutionResult } from '../types/prover';
import { globalShadowWorkspaceManager } from './shadow-workspace-manager';
import { TargetTestVerifier } from './target-verifier';
import { RegressionVerifier } from './regression-verifier';
import { ProofCertifier } from './certifier';
import { globalProofCache } from './cache';

export class DualPassOrchestrator {
  public static async executeProof(req: ProverExecutionRequest): Promise<ProverExecutionResult> {
    const startTime = Date.now();
    const scenarioId = req.scenarioId || 'ecommerce_checkout';
    const workspaceRoot = req.workspacePath || 'd:/Coding/PROOFix';

    // 1. Create ephemeral shadow workspace
    const shadowPath = globalShadowWorkspaceManager.createShadowWorkspace({
      baseDirectory: workspaceRoot,
    });

    try {
      // 2. Pass 2 Target Verification
      const targetRes = await TargetTestVerifier.verifyTargetDefect(scenarioId, shadowPath);

      // 3. Pass 2 Regression Suite
      const regressionRes = await RegressionVerifier.runBaselineRegressionSuite(shadowPath);

      const durationMs = Date.now() - startTime;
      const certificate = ProofCertifier.issueCertificate(
        scenarioId,
        req.patchDiff || '// Default self-healing patch',
        { checkId: 'chk_pass1_failure', errorSummary: 'Observed defect before patch' },
        {
          targetCheckPassed: targetRes.passed,
          regressionCount: regressionRes.regressionCount,
          passedRegressionCount: regressionRes.passedRegressionCount,
          passRate: regressionRes.passRate,
          latencyMs: durationMs,
        }
      );

      globalProofCache.set(certificate);

      return {
        runId: 'prover_run_' + Date.now().toString(36),
        status: certificate.status,
        durationMs,
        iterationsRun: 1,
        certificate,
        appliedPatch: req.patchDiff,
      };
    } finally {
      globalShadowWorkspaceManager.cleanup(shadowPath);
    }
  }
}
