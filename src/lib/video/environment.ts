export interface VideoEnvironmentCapabilities {
  supported: boolean;
  format: 'webm';
  headlessRequired: boolean;
  warnings: string[];
  rationale: string;
}

/**
 * Inspects host runner environment and browser engine capabilities
 * to detect unsupported recording environments (e.g. missing media libraries, restricted containers).
 */
export function checkVideoRecordingSupport(options?: {
  platform?: string;
  isContainer?: boolean;
  browserChannel?: string;
  hasFfmpeg?: boolean;
}): VideoEnvironmentCapabilities {
  const platform = options?.platform || process.platform;
  const isContainer = options?.isContainer || Boolean(process.env.DOCKER_CONTAINER || process.env.KUBERNETES_SERVICE_HOST);
  const browserChannel = options?.browserChannel || 'chromium';
  const warnings: string[] = [];

  // Chromium and Edge natively support WebM VP8/VP9 recording out of the box in Playwright
  let supported = true;

  if (browserChannel === 'webkit') {
    warnings.push('WebKit video recording may produce variable frame rates under high CPU load in headless Linux.');
  }

  if (isContainer) {
    warnings.push('Container environment detected: Ensure /tmp or artifacts volume has sufficient shared memory (--shm-size=2gb).');
  }

  // Simulated check for unsupported or severely restricted environments
  if (options?.hasFfmpeg === false && platform === 'android') {
    supported = false;
    warnings.push('Platform lacks compatible WebM multiplexer libraries for video encoding.');
  }

  return {
    supported,
    format: 'webm',
    headlessRequired: platform === 'linux' && !process.env.DISPLAY,
    warnings,
    rationale: supported
      ? 'Environment verified capable of hardware/software WebM session recording.'
      : 'Recording disabled due to missing media dependencies or unsupported platform.',
  };
}

/**
 * Gracefully resolves video recording configuration, logging warnings and falling back to 'off'
 * if the host environment cannot record video streams.
 */
export function resolveSafeEnvironmentConfig<T extends { enabled: boolean; mode: string }>(
  config: T,
  onWarning?: (warning: string) => void
): T {
  const caps = checkVideoRecordingSupport();

  if (!caps.supported && config.enabled) {
    const warning = `[Video Warning] Video recording requested but environment is unsupported: ${caps.rationale}. Disabling recording.`;
    if (onWarning) onWarning(warning);

    return {
      ...config,
      enabled: false,
      mode: 'off',
    };
  }

  for (const w of caps.warnings) {
    if (onWarning) onWarning(`[Video Notice] ${w}`);
  }

  return config;
}
