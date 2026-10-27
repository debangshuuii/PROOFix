import { FailureVideoStep, ActionTestItem } from './action-types';

/**
 * Correlates test step execution failures with timestamped positions inside the captured Playwright video recording.
 */
export function linkVideoFailureSteps(
  results: ActionTestItem[],
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
    const resAny = res as any;
    const durationSec = Math.max(0.5, (resAny.durationMs || 1000) / 1000);
    const failureTimestamp = accumulatedSec + durationSec * 0.8;

    if (resAny.status === 'failed' || resAny.status === 'error') {
      const stepName = resAny.title || resAny.name || resAny.route || `Step #${i + 1}`;
      const err = resAny.error || resAny.errorDetails?.message;
      const errorSnippet = err ? err.split('\n')[0].substring(0, 150) : undefined;

      steps.push({
        stepIndex: i + 1,
        stepName,
        status: (resAny.status === 'timeout' ? 'timeout' : 'failed') as 'failed' | 'timeout',
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

/**
 * Formats a video failure section with timestamp bookmarks into GitHub-flavored Markdown.
 */
export function formatFailureVideoSectionMarkdown(
  steps: FailureVideoStep[],
  videoUrl?: string
): string {
  if (!steps || steps.length === 0) {
    return '';
  }

  const primaryVideoLink = videoUrl || (steps[0] && steps[0].videoUrl);
  const videoBadge = primaryVideoLink
    ? `[🎬 **Download Playwright Failure Recording (.webm)**](${primaryVideoLink})`
    : `🎬 **Playwright Failure Recording Captured** *(attached to workflow run artifacts)*`;

  const rows = steps.map((s) => {
    const timestampFormatted = formatVideoTimestamp(s.videoTimestampSec);
    const deepLink = primaryVideoLink ? `[▶ ${timestampFormatted}](${primaryVideoLink}#t=${s.videoTimestampSec})` : `\`${timestampFormatted}\``;
    const snippet = s.errorSnippet ? `<code>${s.errorSnippet}</code>` : '<em>Inspection Failed</em>';

    return `| Step #${s.stepIndex} | **${s.stepName}** | ${deepLink} | ${snippet} |`;
  }).join('\n');

  return `
<details>
<summary><b>📹 Failure Video Recording & Timeline Bookmarks (${steps.length} failure point${steps.length > 1 ? 's' : ''})</b></summary>

${videoBadge}

| Step | Test Journey Target | Video Timestamp | Failure Cause |
| :---: | :--- | :---: | :--- |
${rows}

</details>
`.trim();
}
