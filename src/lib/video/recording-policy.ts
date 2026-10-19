import type { VideoRecordingMode, VideoArtifactMetadata, VideoRecordingReportSummary } from '../types/video.ts';
import type { TestResult, TestStatus } from '../types/index.ts';

export interface PolicyEvaluationResult {
  shouldRecord: boolean;
  shouldRetain: boolean;
  action: 'record_and_keep' | 'record_and_discard' | 'skip';
  rationale: string;
}

/**
 * Evaluates whether a test should be recorded or retained based on the active VideoRecordingMode policy.
 */
export function evaluateRecordingPolicy(
  mode: VideoRecordingMode,
  testStatus?: TestStatus,
  options?: { isRetry?: boolean }
): PolicyEvaluationResult {
  const isRetry = Boolean(options?.isRetry);

  if (mode === 'off') {
    return {
      shouldRecord: false,
      shouldRetain: false,
      action: 'skip',
      rationale: 'Video recording policy is set to "off". No video captured.',
    };
  }

  if (mode === 'all') {
    return {
      shouldRecord: true,
      shouldRetain: true,
      action: 'record_and_keep',
      rationale: 'Policy "all" retains video recordings for every test regardless of outcome.',
    };
  }

  if (mode === 'only-on-failure') {
    if (testStatus === 'failed') {
      return {
        shouldRecord: true,
        shouldRetain: true,
        action: 'record_and_keep',
        rationale: 'Test failed under "only-on-failure" policy: recording retained for visual debugging.',
      };
    }
    return {
      shouldRecord: true,
      shouldRetain: false,
      action: 'record_and_discard',
      rationale: `Test status was "${testStatus || 'passed'}": temporary recording discarded under "only-on-failure" policy.`,
    };
  }

  if (mode === 'retain-on-failure') {
    if (testStatus === 'failed' || isRetry) {
      return {
        shouldRecord: true,
        shouldRetain: true,
        action: 'record_and_keep',
        rationale: isRetry
          ? 'Test executed in retry scenario under "retain-on-failure": recording retained.'
          : 'Test failed under "retain-on-failure": recording retained.',
      };
    }
    return {
      shouldRecord: true,
      shouldRetain: false,
      action: 'record_and_discard',
      rationale: 'Test passed on initial attempt without failure or retries: temporary video discarded.',
    };
  }

  return {
    shouldRecord: false,
    shouldRetain: false,
    action: 'skip',
    rationale: `Unknown recording mode "${mode}".`,
  };
}

/**
 * Generates an auditable report summary identifying which tests were recorded,
 * which recordings were discarded under policy, and total storage consumption.
 * "Done when: the selected policy is respected and the report identifies which tests were recorded."
 */
export function generateVideoRecordingReport(
  testResults: TestResult[],
  videoArtifacts: VideoArtifactMetadata[],
  mode: VideoRecordingMode
): VideoRecordingReportSummary {
  const videoMap = new Map<string, VideoArtifactMetadata>();
  for (const v of videoArtifacts) {
    if (v.testResultId) {
      videoMap.set(v.testResultId, v);
    }
  }

  let totalSizeBytes = 0;
  let recordedCount = 0;
  let discardedCount = 0;

  const testRecordings = testResults.map((test) => {
    const video = videoMap.get(test.id);
    const hasRecording = Boolean(video && video.status === 'ready');

    if (hasRecording) {
      recordedCount++;
      totalSizeBytes += video?.sizeBytes || 0;
    } else if (mode !== 'off') {
      discardedCount++;
    }

    return {
      testId: test.id,
      testName: test.name,
      recorded: hasRecording,
      videoArtifactId: video?.id,
      status: video?.status || (mode === 'off' ? 'discarded' : 'discarded'),
      publicUrl: video?.publicUrl,
    };
  });

  return {
    policyApplied: mode,
    totalTests: testResults.length,
    recordedCount,
    discardedCount,
    totalSizeBytes,
    testRecordings,
  };
}
