/**
 * Interactive Demo Playground Engine
 *
 * Orchestrates 1-click sandbox project provisioning, simulated test suite
 * execution with telemetry streaming, and post-patch self-healing verification.
 */

import { db } from '../db/index.ts';
import { ScenarioRegistry } from './registry.ts';
import { generateDemoProjectId, generateDemoRunId } from './utils.ts';
import type {
  DemoScenarioId,
  PlaygroundLaunchOptions,
  PlaygroundRunResponse,
  PlaygroundFixResult,
  DemoScenarioContract,
} from './types.ts';
import type { VerificationRun, TestResult } from '../types/index.ts';
import type { FixProposal } from '../types/proposal.ts';

export class PlaygroundEngine {
  /**
   * Provision the scenario project and baseline run into the local database
   */
  static async provisionScenario(scenarioId: DemoScenarioId): Promise<{
    project: any;
    run: VerificationRun;
    scenario: DemoScenarioContract;
  }> {
    const scenario = ScenarioRegistry.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    const projectId = generateDemoProjectId(scenarioId);
    let project = await db.getProjectById(projectId);

    if (!project) {
      const newProject = {
        ...scenario.seedProject,
        id: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.createProject(newProject as any);
      project = newProject as any;
    }

    // Save baseline run and initial tests
    const existingRun = await db.getRunById(scenario.preloadedRun.id);
    const run: VerificationRun = {
      ...scenario.preloadedRun,
      projectId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    if (!existingRun) {
      await db.createRun(run);
    } else {
      await db.updateRun(run.id, run);
    }

    await db.saveTestResults(scenario.initialTestResults);
    await db.saveFindings(scenario.initialFindings);

    return { project, run, scenario };
  }

  /**
   * Launch a fresh interactive demo run for the specified scenario
   */
  static async launchDemoRun(
    scenarioId: DemoScenarioId,
    _options: PlaygroundLaunchOptions = {}
  ): Promise<PlaygroundRunResponse> {
    const scenario = ScenarioRegistry.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    const { project } = await this.provisionScenario(scenarioId);
    const newRunId = generateDemoRunId(scenarioId, 'live');

    // Create a new run record replicating the failure evidence for review
    const liveRun: VerificationRun = {
      ...scenario.preloadedRun,
      id: newRunId,
      projectId: project.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    // Replicate test results with unique runId
    const testResults: TestResult[] = scenario.initialTestResults.map((t, idx) => ({
      ...t,
      id: `t-demo-${scenarioId}-${idx}-${Date.now().toString(36)}`,
      runId: newRunId,
      timestamp: new Date().toISOString(),
    }));

    const findings = scenario.initialFindings.map((f, idx) => ({
      ...f,
      id: `f-demo-${scenarioId}-${idx}-${Date.now().toString(36)}`,
      runId: newRunId,
    }));

    await db.createRun(liveRun);
    await db.saveTestResults(testResults);
    await db.saveFindings(findings);

    return {
      success: true,
      scenarioId,
      projectId: project.id,
      runId: newRunId,
      runUrl: `/projects/${project.id}/runs/${newRunId}`,
      status: 'failed',
      message: `Scenario '${scenario.title}' executed: ${scenario.fault.headline}`,
      stagesCompleted: 11,
      faultDetected: true,
    };
  }

  /**
   * Apply the AI fix proposal and produce a verified 100% green run
   */
  static async applyDemoFix(
    scenarioId: DemoScenarioId,
    originalRunId: string
  ): Promise<PlaygroundFixResult> {
    const scenario = ScenarioRegistry.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    const projectId = generateDemoProjectId(scenarioId);
    const verifiedRunId = generateDemoRunId(scenarioId, 'verified');
    const proposalId = `prop-demo-${scenarioId}-${Date.now().toString(36)}`;

    // 1. Create and save FixProposal
    const proposal: FixProposal = {
      id: proposalId,
      runId: originalRunId,
      projectId,
      title: scenario.fixProposal.summary,
      description: scenario.aiDiagnosis.explanation,
      confidenceScore: scenario.aiDiagnosis.confidenceScore,
      targetFile: scenario.fixProposal.targetFile,
      patchDiff: scenario.fixProposal.patchDiff,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 2. Synthesize verified post-patch run where all tests pass
    const originalTests = scenario.initialTestResults;
    const verifiedTests: TestResult[] = originalTests.map((t, idx) => ({
      ...t,
      id: `t-ver-${scenarioId}-${idx}-${Date.now().toString(36)}`,
      runId: verifiedRunId,
      status: 'passed',
      errorMessage: undefined,
      timestamp: new Date().toISOString(),
    }));

    const verifiedRun: VerificationRun = {
      ...scenario.preloadedRun,
      id: verifiedRunId,
      projectId,
      status: 'completed',
      summary: {
        totalTests: verifiedTests.length,
        passed: verifiedTests.length,
        failed: 0,
        blocked: 0,
        skipped: 0,
      },
      stages: scenario.preloadedRun.stages?.map((s) => ({
        ...s,
        status: 'passed',
      })) || [],
      logs: [
        `[patch] Applied verified fix proposal ${proposalId}`,
        `[patch] Target file: ${scenario.fixProposal.targetFile}`,
        '[sandbox] Re-executing Playwright testbed verification...',
        ...verifiedTests.map((t) => `[test] ✓ ${t.name} passed`),
        '[verification] ALL TESTS GREEN (100% pass rate). Regression check clean.',
      ],
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date().toISOString(),
    };

    await db.createRun(verifiedRun);
    await db.saveTestResults(verifiedTests);
    await db.saveFindings([]); // Zero findings on verified run

    return {
      success: true,
      scenarioId,
      originalRunId,
      verifiedRunId,
      proposalId: proposal.id,
      patchApplied: true,
      testsPassed: verifiedTests.length,
      testsFailed: 0,
      verifiedRunUrl: `/projects/${projectId}/runs/${verifiedRunId}`,
      status: 'passed',
    };
  }

  /**
   * Reset scenario data back to baseline
   */
  static async resetScenario(scenarioId: DemoScenarioId): Promise<{ success: boolean; message: string }> {
    const scenario = ScenarioRegistry.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    await this.provisionScenario(scenarioId);
    return {
      success: true,
      message: `Scenario '${scenario.title}' has been reset to pristine baseline.`,
    };
  }
}
