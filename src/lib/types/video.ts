export type VideoRecordingMode = 'off' | 'all' | 'only-on-failure' | 'retain-on-failure';

export interface VideoResolution {
  width: number;
  height: number;
}

export interface VideoRetentionPolicy {
  maxAgeDays: number;
  maxTotalStorageMb: number;
  maxPerFileMb: number;
}

export interface VideoRecordingConfig {
  enabled: boolean;
  mode: VideoRecordingMode;
  resolution: VideoResolution;
  fps?: number;
  retention: VideoRetentionPolicy;
  dir?: string;
}

export type VideoProcessingStatus =
  | 'initializing'
  | 'recording'
  | 'finalizing'
  | 'ready'
  | 'failed'
  | 'discarded'
  | 'cleaned_up';

export interface VideoArtifactMetadata {
  id: string;
  runId: string;
  projectId: string;
  testResultId?: string;
  browserContextId: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  mimeType: 'video/webm';
  sizeBytes: number;
  durationMs: number;
  resolution: VideoResolution;
  status: VideoProcessingStatus;
  createdAt: string;
  testName?: string;
  isFailureRecording: boolean;
  error?: string;
}

export interface VideoRecordingReportSummary {
  policyApplied: VideoRecordingMode;
  totalTests: number;
  recordedCount: number;
  discardedCount: number;
  totalSizeBytes: number;
  testRecordings: {
    testId: string;
    testName: string;
    recorded: boolean;
    videoArtifactId?: string;
    status: VideoProcessingStatus;
    publicUrl?: string;
  }[];
}

export interface RetentionCleanupResult {
  checkedCount: number;
  deletedCount: number;
  bytesReclaimed: number;
  errors: string[];
  activeRunsPreserved: string[];
}
