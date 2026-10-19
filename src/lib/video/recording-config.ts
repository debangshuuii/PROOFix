import type {
  VideoRecordingConfig,
  VideoRecordingMode,
  VideoResolution,
  VideoRetentionPolicy,
} from '../types/video.ts';

export const VALID_RECORDING_MODES: readonly VideoRecordingMode[] = [
  'off',
  'all',
  'only-on-failure',
  'retain-on-failure',
] as const;

export const DEFAULT_VIDEO_CONFIG: Readonly<VideoRecordingConfig> = Object.freeze({
  enabled: false,
  mode: 'off',
  resolution: Object.freeze({
    width: 1280,
    height: 720,
  }),
  fps: 25,
  retention: Object.freeze({
    maxAgeDays: 14,
    maxTotalStorageMb: 500,
    maxPerFileMb: 50,
  }),
});

export function isValidRecordingMode(mode: unknown): mode is VideoRecordingMode {
  return typeof mode === 'string' && (VALID_RECORDING_MODES as readonly string[]).includes(mode);
}

export function validateResolution(resolution: unknown): VideoResolution {
  if (!resolution || typeof resolution !== 'object') {
    throw new Error('Video resolution must be an object with numeric width and height.');
  }

  const { width, height } = resolution as Record<string, unknown>;

  if (typeof width !== 'number' || !Number.isInteger(width) || width < 320 || width > 3840) {
    throw new Error(`Invalid video width "${width}". Width must be an integer between 320 and 3840 pixels.`);
  }

  if (typeof height !== 'number' || !Number.isInteger(height) || height < 240 || height > 2160) {
    throw new Error(`Invalid video height "${height}". Height must be an integer between 240 and 2160 pixels.`);
  }

  return { width, height };
}

export function validateRetentionPolicy(policy: unknown): VideoRetentionPolicy {
  if (!policy || typeof policy !== 'object') {
    throw new Error('Video retention policy must be an object with maxAgeDays, maxTotalStorageMb, and maxPerFileMb.');
  }

  const { maxAgeDays, maxTotalStorageMb, maxPerFileMb } = policy as Record<string, unknown>;

  if (typeof maxAgeDays !== 'number' || !Number.isInteger(maxAgeDays) || maxAgeDays < 1 || maxAgeDays > 365) {
    throw new Error(`Invalid retention maxAgeDays "${maxAgeDays}". Must be an integer between 1 and 365 days.`);
  }

  if (typeof maxTotalStorageMb !== 'number' || maxTotalStorageMb < 10 || maxTotalStorageMb > 50000) {
    throw new Error(`Invalid maxTotalStorageMb "${maxTotalStorageMb}". Must be a number between 10MB and 50000MB.`);
  }

  if (typeof maxPerFileMb !== 'number' || maxPerFileMb < 1 || maxPerFileMb > 1000) {
    throw new Error(`Invalid maxPerFileMb "${maxPerFileMb}". Must be a number between 1MB and 1000MB.`);
  }

  return {
    maxAgeDays,
    maxTotalStorageMb,
    maxPerFileMb,
  };
}

export function validateVideoConfig(input?: unknown): VideoRecordingConfig {
  if (input === undefined || input === null) {
    return {
      ...DEFAULT_VIDEO_CONFIG,
      resolution: { ...DEFAULT_VIDEO_CONFIG.resolution },
      retention: { ...DEFAULT_VIDEO_CONFIG.retention },
    };
  }

  if (typeof input !== 'object') {
    throw new Error('Video recording configuration must be an object.');
  }

  const raw = input as Record<string, unknown>;

  // Mode validation
  const mode = raw.mode !== undefined ? raw.mode : DEFAULT_VIDEO_CONFIG.mode;
  if (!isValidRecordingMode(mode)) {
    throw new Error(
      `Invalid recording mode "${mode}". Supported modes are: ${VALID_RECORDING_MODES.join(', ')}.`
    );
  }

  // Enabled flag defaults: if mode is 'off', enabled is false. If mode != 'off' and enabled is not explicitly set, enabled is true.
  let enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : mode !== 'off';
  if (mode === 'off') {
    enabled = false;
  }

  // Resolution validation
  const resolution = raw.resolution !== undefined
    ? validateResolution(raw.resolution)
    : { ...DEFAULT_VIDEO_CONFIG.resolution };

  // FPS validation
  let fps = DEFAULT_VIDEO_CONFIG.fps;
  if (raw.fps !== undefined) {
    if (typeof raw.fps !== 'number' || !Number.isInteger(raw.fps) || raw.fps < 5 || raw.fps > 60) {
      throw new Error(`Invalid video fps "${raw.fps}". FPS must be an integer between 5 and 60.`);
    }
    fps = raw.fps;
  }

  // Retention validation
  const retention = raw.retention !== undefined
    ? validateRetentionPolicy(raw.retention)
    : { ...DEFAULT_VIDEO_CONFIG.retention };

  // Optional custom dir
  let dir: string | undefined = undefined;
  if (raw.dir !== undefined) {
    if (typeof raw.dir !== 'string' || raw.dir.trim().length === 0) {
      throw new Error('Video output directory must be a non-empty string when specified.');
    }
    dir = raw.dir.trim();
  }

  return {
    enabled,
    mode,
    resolution,
    fps,
    retention,
    ...(dir ? { dir } : {}),
  };
}

export function resolveVideoConfig(
  projectVideoConfig?: Partial<VideoRecordingConfig>,
  runOverrides?: Partial<VideoRecordingConfig>
): VideoRecordingConfig {
  const merged = {
    ...DEFAULT_VIDEO_CONFIG,
    ...projectVideoConfig,
    ...runOverrides,
    resolution: {
      ...DEFAULT_VIDEO_CONFIG.resolution,
      ...projectVideoConfig?.resolution,
      ...runOverrides?.resolution,
    },
    retention: {
      ...DEFAULT_VIDEO_CONFIG.retention,
      ...projectVideoConfig?.retention,
      ...runOverrides?.retention,
    },
  };

  return validateVideoConfig(merged);
}
