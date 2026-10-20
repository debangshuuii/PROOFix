/**
 * Semantic Visual Pre-Filter & Anti-Aliasing Filter
 * Contribution 114 (Point 2, Contribution 4)
 * Distinguishes subpixel font anti-aliasing from macroscopic structural regressions.
 */

export interface SemanticComparisonPreFilterResult {
  needsVisionAiEvaluation: boolean;
  totalPixels: number;
  rawDiffPixels: number;
  filteredDiffPixels: number;
  macroscopicDiffRatio: number; // 0.0 to 1.0
  isPureAntiAliasing: boolean;
  estimatedSeverity: 'none' | 'low' | 'moderate' | 'high';
  reason: string;
}

export interface SemanticComparatorOptions {
  colorDistanceThreshold?: number; // 0 to 255 Euclidean distance for perceptual difference
  antiAliasingToleranceRatio?: number; // Maximum ratio of diff pixels considered AA noise (e.g. 0.015 = 1.5%)
  minPixelChangeForAi?: number; // Minimum number of macroscopic changed pixels to trigger AI vision model
}

/**
 * Calculates Euclidean RGB distance between two pixels.
 */
export function calculateColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Evaluates whether differences between baseline and candidate images require
 * multimodal vision model inspection or can be safely discarded as anti-aliasing jitter.
 */
export function preFilterVisualDifferences(
  baselineRgba: Uint8Array | Buffer,
  candidateRgba: Uint8Array | Buffer,
  width: number,
  height: number,
  options: SemanticComparatorOptions = {}
): SemanticComparisonPreFilterResult {
  const colorThreshold = options.colorDistanceThreshold ?? 16;
  const aaTolerance = options.antiAliasingToleranceRatio ?? 0.012; // 1.2% of screen
  const minPixels = options.minPixelChangeForAi ?? 40;

  const totalPixels = width * height;
  if (totalPixels === 0) {
    return {
      needsVisionAiEvaluation: false,
      totalPixels: 0,
      rawDiffPixels: 0,
      filteredDiffPixels: 0,
      macroscopicDiffRatio: 0,
      isPureAntiAliasing: false,
      estimatedSeverity: 'none',
      reason: 'Empty image dimensions.',
    };
  }

  let rawDiffPixels = 0;
  let filteredDiffPixels = 0;

  const len = Math.min(baselineRgba.length, candidateRgba.length);
  const pixelCount = Math.floor(len / 4);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r1 = baselineRgba[idx];
    const g1 = baselineRgba[idx + 1];
    const b1 = baselineRgba[idx + 2];
    const a1 = baselineRgba[idx + 3];

    const r2 = candidateRgba[idx];
    const g2 = candidateRgba[idx + 1];
    const b2 = candidateRgba[idx + 2];
    const a2 = candidateRgba[idx + 3];

    if (r1 !== r2 || g1 !== g2 || b1 !== b2 || a1 !== a2) {
      rawDiffPixels++;
      const dist = calculateColorDistance(r1, g1, b1, r2, g2, b2);

      // If distance exceeds subtle anti-aliasing color threshold, it's macroscopic
      if (dist > colorThreshold || Math.abs(a1 - a2) > 20) {
        filteredDiffPixels++;
      }
    }
  }

  const macroscopicDiffRatio = Number((filteredDiffPixels / totalPixels).toFixed(4));
  const isPureAntiAliasing = rawDiffPixels > 0 && filteredDiffPixels === 0;

  let estimatedSeverity: SemanticComparisonPreFilterResult['estimatedSeverity'] = 'none';
  let needsVisionAiEvaluation = false;
  let reason = 'Images are visually identical.';

  if (isPureAntiAliasing) {
    reason = `Detected ${rawDiffPixels} subpixel differences below perceptual threshold; classified as harmless font/rendering anti-aliasing.`;
  } else if (filteredDiffPixels > 0) {
    if (macroscopicDiffRatio > 0.08) {
      estimatedSeverity = 'high';
      needsVisionAiEvaluation = true;
      reason = `Gross visual regression detected (${(macroscopicDiffRatio * 100).toFixed(1)}% of screen modified).`;
    } else if (macroscopicDiffRatio > 0.01) {
      estimatedSeverity = 'moderate';
      needsVisionAiEvaluation = true;
      reason = `Moderate structural or element changes detected (${filteredDiffPixels} macroscopic pixels changed).`;
    } else if (filteredDiffPixels >= minPixels) {
      estimatedSeverity = 'low';
      needsVisionAiEvaluation = true;
      reason = `Localized visual modification detected (${filteredDiffPixels} pixels).`;
    } else {
      estimatedSeverity = 'none';
      reason = `Minor isolated pixel fluctuations (${filteredDiffPixels} px) below AI evaluation threshold.`;
    }
  }

  return {
    needsVisionAiEvaluation,
    totalPixels,
    rawDiffPixels,
    filteredDiffPixels,
    macroscopicDiffRatio,
    isPureAntiAliasing,
    estimatedSeverity,
    reason,
  };
}
