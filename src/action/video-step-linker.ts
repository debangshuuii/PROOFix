import { FailureVideoStep } from './action-types';
import { TestExecutionResult } from '../lib/types';

/**
 * Correlates test step execution failures with timestamped positions inside the captured Playwright video recording.
 */
export function linkVideoFailureSteps(
  results: TestExecutionResult[],
  videoOptions?: {
    videoUrl?: string;
    localVideoPath?: string;
    totalDurationSec?: number;
  }
): FailureVideoStep[] {
  const steps: FailureVideoStep[] = [];
  let accumulatedSec = 0;

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const durationSec = Math.max(0.5, (res.durationMs || 1000) / 1000);
    const failureTimestamp = accumulatedSec + durationSec * 0.8;

    if (res.status === 'failed' || res.status === 'error') {
      const stepName = res.title || res.route || `Step #${i + 1}`;
      const errorSnippet = res.error ? res.error.split('\n')[0].substring(0, 150) : undefined;

      steps.push({
        stepIndex: i + 1,
        stepName,
        status: res.status as 'failed' | 'timeout',
        videoTimestampSec: parseFloat(failureTimestamp.toFixed(1)),
        videoUrl: videoOptions?.videoUrl,
        localVideoPath: videoOptions?.localVideoPath,
        errorSnippet,
      });
    }

    accumulatedSec += durationSec;
  }

  return steps;
}

/**
 * Formats a failure video timestamp into mm:ss format.
 */
export function formatVideoTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
