import path from 'path';
import type { VideoArtifactMetadata, VideoProcessingStatus, VideoResolution } from '../types/video.ts';
import type { TestResult, Artifact } from '../types/index.ts';

export interface CreateVideoMetadataParams {
  runId: string;
  projectId: string;
  testResultId: string;
  browserContextId: string;
  storagePath: string;
  sizeBytes: number;
  durationMs: number;
  resolution: VideoResolution;
  status: VideoProcessingStatus;
  testName?: string;
  isFailureRecording?: boolean;
  error?: string;
}

/**
 * Builds an isolated, strictly namespaced file path for a recording artifact.
 * Parallel runs and tests cannot collide or overwrite each other.
 */
export function buildNamespacedVideoPath(
  artifactsDir: string,
  runId: string,
  testResultId: string,
  browserContextId: string
): { storagePath: string; fileName: string; publicUrl: string } {
  // Sanitize path components
  const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTestId = testResultId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeContextId = browserContextId.replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName = `test_${safeTestId}_ctx_${safeContextId}.webm`;
  const storagePath = path.join(artifactsDir, 'runs', safeRunId, 'videos', fileName);
  const publicUrl = `/artifacts/runs/${safeRunId}/videos/${fileName}`;

  return { storagePath, fileName, publicUrl };
}

/**
 * Creates validated VideoArtifactMetadata bound to run, test, and browser context.
 */
export function createVideoArtifactMetadata(params: CreateVideoMetadataParams): VideoArtifactMetadata {
  const {
    runId,
    projectId,
    testResultId,
    browserContextId,
    storagePath,
    sizeBytes,
    durationMs,
    resolution,
    status,
    testName,
    isFailureRecording = false,
    error,
  } = params;

  if (!runId || !runId.trim()) {
    throw new Error('Video metadata requires a valid, non-empty runId.');
  }
  if (!testResultId || !testResultId.trim()) {
    throw new Error('Video metadata requires a valid, non-empty testResultId.');
  }
  if (!browserContextId || !browserContextId.trim()) {
    throw new Error('Video metadata requires a valid browserContextId.');
  }

  const id = `vid_${runId}_${testResultId}_${browserContextId}`;
  const fileName = path.basename(storagePath);
  const publicUrl = `/artifacts/runs/${runId}/videos/${fileName}`;

  return {
    id,
    runId,
    projectId,
    testResultId,
    browserContextId,
    fileName,
    storagePath,
    publicUrl,
    mimeType: 'video/webm',
    sizeBytes,
    durationMs,
    resolution,
    status,
    createdAt: new Date().toISOString(),
    testName,
    isFailureRecording,
    error,
  };
}

/**
 * Associates a video recording artifact with a TestResult.
 * Strictly prevents cross-run and cross-test contamination in parallel runs.
 * "Done when: parallel runs cannot attach a recording to the wrong test."
 */
export function attachRecordingToTest(
  video: VideoArtifactMetadata,
  targetTest: TestResult
): TestResult {
  // Verification check 1: Run ID match
  if (targetTest.runId !== video.runId) {
    throw new Error(
      `Cross-run violation: Cannot attach video recording from run "${video.runId}" to test belonging to run "${targetTest.runId}".`
    );
  }

  // Verification check 2: Test result ID match
  if (video.testResultId && targetTest.id !== video.testResultId) {
    throw new Error(
      `Cross-test violation: Cannot attach recording bound to test "${video.testResultId}" to test "${targetTest.id}".`
    );
  }

  // Return cloned test result with enriched evidence
  return {
    ...targetTest,
    evidence: {
      ...targetTest.evidence,
      videoPath: video.publicUrl,
      videoArtifactId: video.id,
      videoStatus: video.status,
    },
  };
}

/**
 * Persists video recording metadata to database artifacts collection.
 */
export async function persistVideoArtifact(
  video: VideoArtifactMetadata,
  dbInstance?: { saveArtifact: (artifact: Artifact) => Promise<any> }
): Promise<Artifact> {
  const artifact: Artifact = {
    id: video.id,
    runId: video.runId,
    testResultId: video.testResultId,
    artifactType: 'execution_trace',
    storagePath: video.storagePath,
    fileName: video.fileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes,
    createdAt: video.createdAt,
  };

  if (dbInstance) {
    await dbInstance.saveArtifact(artifact);
  }
  return artifact;
}
