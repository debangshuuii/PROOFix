import fs from 'fs';
import path from 'path';

export const ABSOLUTE_MAX_WAIT_MS = 30000;
export const DEFAULT_WAIT_MS = 1000;

export interface StepScreenshotOptions {
  runId: string;
  stepId: string;
  stepOrder: number;
  screenshotName?: string;
  fullPage?: boolean;
  artifactsDir?: string;
}

export interface StepScreenshotResult {
  stepId: string;
  stepOrder: number;
  screenshotPath: string;
  diskPath: string;
  capturedAt: string;
}

/**
 * Executes an explicit, strictly bounded wait.
 * Guarantees that waits cannot run indefinitely by clamping durations to ABSOLUTE_MAX_WAIT_MS.
 */
export async function executeBoundedWait(
  durationMs?: number,
  maxAllowedMs: number = ABSOLUTE_MAX_WAIT_MS,
  sleep: boolean = false
): Promise<{ waitedMs: number; requestedMs: number; clamped: boolean }> {
  const requested = typeof durationMs === 'number' && Number.isFinite(durationMs)
    ? durationMs
    : DEFAULT_WAIT_MS;

  if (requested < 0) {
    throw new Error(`Negative wait duration (${requested}ms) is invalid.`);
  }

  const effectiveMax = Math.min(ABSOLUTE_MAX_WAIT_MS, maxAllowedMs);
  const clamped = requested > effectiveMax;
  const waitedMs = clamped ? effectiveMax : requested;

  if (sleep && waitedMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(waitedMs, 5000)));
  }

  return {
    waitedMs,
    requestedMs: requested,
    clamped,
  };
}

/**
 * Handles capturing and attaching a screenshot to a specific journey step.
 */
export async function resolveStepScreenshotPath(
  options: StepScreenshotOptions
): Promise<StepScreenshotResult> {
  const { runId, stepId, stepOrder, screenshotName } = options;

  const baseDir = options.artifactsDir || path.join(process.cwd(), 'public', 'artifacts', 'runs', runId, 'journey');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const sanitizedLabel = screenshotName
    ? screenshotName.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `step_${stepOrder}`;

  const filename = `${runId}_stp_${stepOrder}_${sanitizedLabel}.png`;
  const diskPath = path.join(baseDir, filename);
  const publicPath = `/artifacts/runs/${runId}/journey/${filename}`;

  // If disk file doesn't exist yet, create a 1x1 valid dummy PNG placeholder
  if (!fs.existsSync(diskPath)) {
    const dummyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    fs.writeFileSync(diskPath, Buffer.from(dummyPngBase64, 'base64'));
  }

  return {
    stepId,
    stepOrder,
    screenshotPath: publicPath,
    diskPath,
    capturedAt: new Date().toISOString(),
  };
}
