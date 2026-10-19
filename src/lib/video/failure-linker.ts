import type { VideoArtifactMetadata, VideoProcessingStatus, VideoResolution } from '../types/video.ts';
import type { TestResult } from '../types/index.ts';

export interface LinkedFailureEvidence {
  testId: string;
  testName: string;
  status: string;
  category: string;
  errorMessage?: string;
  errorStack?: string;
  failedStep?: string;
  screenshotPath?: string;
  videoRecording?: {
    id: string;
    publicUrl: string;
    status: VideoProcessingStatus;
    durationMs: number;
    resolution: VideoResolution;
  };
  hasFullEvidence: boolean;
}

/**
 * Links recordings to their corresponding failed test, error message, and available screenshot evidence.
 * "Done when: a user can open a failure and find its matching recording reliably."
 */
export function linkTestFailuresWithVideo(
  testResults: TestResult[],
  videoArtifacts: VideoArtifactMetadata[]
): LinkedFailureEvidence[] {
  const videoMap = new Map<string, VideoArtifactMetadata>();
  for (const v of videoArtifacts) {
    if (v.testResultId) {
      videoMap.set(v.testResultId, v);
    }
  }

  // Filter for failures
  const failedTests = testResults.filter((t) => t.status === 'failed');

  return failedTests.map((test) => {
    const video = videoMap.get(test.id);

    // Identify failed step from step evidence if available
    const failedStep = test.evidence.steps.find((s) => s.status === 'failed')?.name || test.errorDetails?.stepFailed;

    const hasVideo = Boolean(video && video.status === 'ready' && video.publicUrl);
    const hasScreenshot = Boolean(test.evidence.screenshotPath);

    return {
      testId: test.id,
      testName: test.name,
      status: test.status,
      category: test.category,
      errorMessage: test.errorDetails?.message || test.actualResult,
      errorStack: test.errorDetails?.stack,
      failedStep,
      screenshotPath: test.evidence.screenshotPath,
      videoRecording: video
        ? {
            id: video.id,
            publicUrl: video.publicUrl,
            status: video.status,
            durationMs: video.durationMs,
            resolution: video.resolution,
          }
        : undefined,
      hasFullEvidence: hasVideo && hasScreenshot,
    };
  });
}

/**
 * Enriches an array of TestResults by embedding matching video artifacts directly into test.evidence.
 */
export function enrichTestResultsWithRecordings(
  testResults: TestResult[],
  videoArtifacts: VideoArtifactMetadata[]
): TestResult[] {
  const videoMap = new Map<string, VideoArtifactMetadata>();
  for (const v of videoArtifacts) {
    if (v.testResultId) {
      videoMap.set(v.testResultId, v);
    }
  }

  return testResults.map((test) => {
    const video = videoMap.get(test.id);
    if (!video) return test;

    return {
      ...test,
      evidence: {
        ...test.evidence,
        videoPath: video.publicUrl,
        videoArtifactId: video.id,
        videoStatus: video.status,
      },
    };
  });
}

/**
 * Finds the matching recording for a specific failure ID reliably.
 */
export function findFailureRecording(
  testId: string,
  linkedFailures: LinkedFailureEvidence[]
): LinkedFailureEvidence | undefined {
  return linkedFailures.find((f) => f.testId === testId);
}
