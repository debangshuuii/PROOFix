import type { VideoProcessingStatus, VideoResolution } from '../types/video.ts';

export type PlayerDisplayState = 'loading' | 'unavailable' | 'playback_error' | 'ready';

export interface PlayerStateModel {
  state: PlayerDisplayState;
  title: string;
  isPlayable: boolean;
  publicUrl?: string;
  formattedDuration: string;
  resolutionLabel?: string;
  statusBadge: VideoProcessingStatus;
  userMessage?: string;
  /** Guard check asserting no OS internal paths are present */
  exposesStorageInternals: boolean;
}

/**
 * Sanitizes any URL or path to ensure raw operating system storage paths are never leaked to client markup.
 */
export function sanitizePlaybackUrl(input?: string): string | undefined {
  if (!input) return undefined;

  // Check if string contains Windows drive letter (e.g. D:\ or C:\) or root unix paths (/Users/, /home/, etc)
  const isInternalDiskPath = /^[a-zA-Z]:[\\/]|^(\/Users|\/home|\/var|\/tmp|\\\\)/i.test(input);

  if (isInternalDiskPath) {
    // If it's inside public artifacts, convert to public relative path
    const normalized = input.replace(/\\/g, '/');
    const publicArtifactIdx = normalized.indexOf('/artifacts/');
    if (publicArtifactIdx !== -1) {
      return normalized.substring(publicArtifactIdx);
    }
    // Otherwise redact completely to avoid exposing storage internals
    return '/api/v1/videos/stream-protected';
  }

  return input;
}

export function formatVideoTime(seconds: number): string {
  const s = Math.floor(seconds || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export function resolvePlayerState(params: {
  status?: VideoProcessingStatus;
  videoUrl?: string;
  storagePath?: string;
  playbackError?: string | null;
  durationMs?: number;
  resolution?: VideoResolution;
  title?: string;
}): PlayerStateModel {
  const {
    status = 'ready',
    videoUrl,
    storagePath,
    playbackError,
    durationMs = 0,
    resolution,
    title = 'Playwright Session Recording',
  } = params;

  const sanitizedUrl = sanitizePlaybackUrl(videoUrl);
  const formattedDuration = formatVideoTime(durationMs / 1000);
  const resolutionLabel = resolution ? `${resolution.width}x${resolution.height}` : undefined;

  // Check for leakage of storagePath in sanitizedUrl
  const exposesStorageInternals = Boolean(
    storagePath && sanitizedUrl && sanitizedUrl.includes(storagePath)
  );

  // 1. Playback error state
  if (playbackError || status === 'failed') {
    return {
      state: 'playback_error',
      title,
      isPlayable: false,
      publicUrl: sanitizedUrl,
      formattedDuration,
      resolutionLabel,
      statusBadge: 'failed',
      userMessage: playbackError || 'Video playback failed due to codec or stream corruption.',
      exposesStorageInternals,
    };
  }

  // 2. Unavailable state (in progress or discarded)
  if (status === 'initializing' || status === 'recording' || status === 'finalizing') {
    return {
      state: 'loading',
      title,
      isPlayable: false,
      formattedDuration,
      resolutionLabel,
      statusBadge: status,
      userMessage:
        status === 'recording'
          ? 'Browser session recording in progress...'
          : 'Finalizing video stream after context closure...',
      exposesStorageInternals: false,
    };
  }

  if (status === 'discarded' || status === 'cleaned_up' || !sanitizedUrl) {
    return {
      state: 'unavailable',
      title,
      isPlayable: false,
      formattedDuration,
      resolutionLabel,
      statusBadge: status,
      userMessage:
        status === 'discarded'
          ? 'Video recording was discarded per policy (test passed without retry).'
          : status === 'cleaned_up'
          ? 'Recording expired and was purged under retention limits.'
          : 'No recording artifact attached to this test result.',
      exposesStorageInternals: false,
    };
  }

  // 3. Ready state
  return {
    state: 'ready',
    title,
    isPlayable: true,
    publicUrl: sanitizedUrl,
    formattedDuration,
    resolutionLabel,
    statusBadge: 'ready',
    exposesStorageInternals,
  };
}
