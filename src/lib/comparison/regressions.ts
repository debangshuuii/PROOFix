import { VerificationRun, TestResult, RunComparison } from '../types';

export function compareRuns(
  baseRun: VerificationRun,
  targetRun: VerificationRun,
  baseResults: TestResult[],
  targetResults: TestResult[]
): RunComparison {
  const baseMap = new Map<string, TestResult>();
  for (const r of baseResults) {
    baseMap.set(r.name, r);
  }

  const newFailures: TestResult[] = [];
  const fixedTests: TestResult[] = [];
  const statusRegressions: {
    testName: string;
    previousStatus: any;
    currentStatus: any;
  }[] = [];

  for (const targetRes of targetResults) {
    const baseRes = baseMap.get(targetRes.name);

    if (!baseRes) {
      if (targetRes.status === 'failed') {
        newFailures.push(targetRes);
      }
      continue;
    }

    if (baseRes.status !== targetRes.status) {
      statusRegressions.push({
        testName: targetRes.name,
        previousStatus: baseRes.status,
        currentStatus: targetRes.status,
      });

      if (baseRes.status === 'passed' && targetRes.status === 'failed') {
        newFailures.push(targetRes);
      } else if (baseRes.status === 'failed' && targetRes.status === 'passed') {
        fixedTests.push(targetRes);
      }
    }
  }

  // Identify new console errors
  const baseErrorTexts = new Set(
    baseResults.flatMap((r) => r.evidence.consoleErrors.map((e) => e.text))
  );

  const targetErrors = targetResults.flatMap((r) => r.evidence.consoleErrors);
  const newConsoleErrors = targetErrors.filter((e) => !baseErrorTexts.has(e.text));

  const baseDuration = baseRun.durationMs || 0;
  const targetDuration = targetRun.durationMs || 0;

  return {
    baseRunId: baseRun.id,
    targetRunId: targetRun.id,
    projectId: targetRun.projectId,
    newFailures,
    fixedTests,
    statusRegressions,
    newConsoleErrors,
    durationDeltaMs: targetDuration - baseDuration,
    isSameCommit: baseRun.commitHash === targetRun.commitHash,
  };
}
