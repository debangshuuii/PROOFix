import { ViewportProfile, ViewportExecutionRecord, MultiViewportMatrixSummary } from '../types/viewport';

export interface ViewportResourceLimits {
  maxProfiles?: number;
  maxConcurrency?: number;
  profileTimeoutMs?: number;
  totalExecutionTimeoutMs?: number;
}

export const DEFAULT_MAX_PROFILES = 6;
export const DEFAULT_MAX_CONCURRENCY = 2;
export const DEFAULT_PROFILE_TIMEOUT_MS = 15000;
export const DEFAULT_TOTAL_TIMEOUT_MS = 60000;

export interface BoundedMatrixExecutionResult {
  records: ViewportExecutionRecord[];
  summary: MultiViewportMatrixSummary;
  timedOutProfiles: string[];
  failedProfiles: string[];
  preservedCompletedCount: number;
  durationMs: number;
}

/**
 * Runs a matrix of viewport profiles within strict resource bounds (profile limit,
 * concurrency bounds, and per-profile timeouts), preserving completed results if
 * another profile crashes or times out.
 */
export async function executeBoundedMatrix(
  profiles: ViewportProfile[],
  executor: (profile: ViewportProfile) => Promise<ViewportExecutionRecord>,
  limits: ViewportResourceLimits = {}
): Promise<BoundedMatrixExecutionResult> {
  const startTime = Date.now();
  const maxProfiles = limits.maxProfiles ?? DEFAULT_MAX_PROFILES;
  const maxConcurrency = Math.max(1, limits.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY);
  const profileTimeoutMs = limits.profileTimeoutMs ?? DEFAULT_PROFILE_TIMEOUT_MS;

  // 1. Bound profile count
  const boundedProfiles = profiles.slice(0, maxProfiles);
  const excessProfiles = profiles.slice(maxProfiles);

  const records: ViewportExecutionRecord[] = [];
  const timedOutProfiles: string[] = [];
  const failedProfiles: string[] = [];

  // Helper to execute a single profile with timeout guard and safe error catching
  const executeWithGuards = async (profile: ViewportProfile): Promise<ViewportExecutionRecord> => {
    const profileStart = Date.now();
    try {
      // Timeout promise
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Profile execution exceeded timeout limit of ${profileTimeoutMs}ms.`));
        }, profileTimeoutMs);
      });

      // Race between execution and timeout
      const record = await Promise.race([executor(profile), timeoutPromise]).finally(() => {
        clearTimeout(timer);
      });

      return record;
    } catch (err: any) {
      const isTimeout = err.message?.includes('exceeded timeout limit');
      if (isTimeout) {
        timedOutProfiles.push(profile.id);
      } else {
        failedProfiles.push(profile.id);
      }

      // Explicitly return a preserved record with timeout or failed status
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: {
          width: profile.width,
          height: profile.height,
          deviceScaleFactor: profile.deviceScaleFactor,
          isMobile: profile.isMobile,
          hasTouch: profile.hasTouch,
        },
        status: isTimeout ? 'timeout' : 'failed',
        durationMs: Date.now() - profileStart,
        testResultIds: [],
        screenshotPaths: [],
        emulationNotice: profile.disclaimer,
        error: err.message || 'Unknown profile execution failure',
      };
    }
  };

  // 2. Bounded Concurrency Pool Execution
  // Process profiles in controlled chunks of maxConcurrency
  for (let i = 0; i < boundedProfiles.length; i += maxConcurrency) {
    const batch = boundedProfiles.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(batch.map((p) => executeWithGuards(p)));
    records.push(...batchResults);
  }

  // 3. Any excess profiles receive explicit 'skipped' status
  for (const excess of excessProfiles) {
    records.push({
      profileId: excess.id,
      profileName: excess.name,
      viewport: {
        width: excess.width,
        height: excess.height,
        deviceScaleFactor: excess.deviceScaleFactor,
        isMobile: excess.isMobile,
        hasTouch: excess.hasTouch,
      },
      status: 'skipped',
      durationMs: 0,
      testResultIds: [],
      screenshotPaths: [],
      emulationNotice: excess.disclaimer,
      error: `Profile skipped because it exceeded the configured max profile limit of ${maxProfiles}.`,
    });
  }

  const passedCount = records.filter((r) => r.status === 'passed').length;
  const failedCount = records.filter((r) => r.status === 'failed' || r.status === 'timeout').length;

  const summary: MultiViewportMatrixSummary = {
    totalProfiles: records.length,
    passedProfiles: passedCount,
    failedProfiles: failedCount,
    profileResults: records,
  };

  return {
    records,
    summary,
    timedOutProfiles,
    failedProfiles,
    preservedCompletedCount: passedCount,
    durationMs: Date.now() - startTime,
  };
}
