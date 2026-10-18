import {
  VisualDiffStatistics,
  VisualChangeClassification,
} from '../types/visual-regression';

export const VISUAL_DIFFERENCE_DISCLAIMER =
  'Notice: Highlighted changes reflect pixel-level rendering variance between builds. These differences are categorized as visual differences, not confirmed bugs; engineers must review whether the change is an intended UI update or an unintended regression.';

/**
 * Computes semantic visual difference statistics adhering to strict non-bug labeling guidelines.
 */
export function computeDiffStatistics(
  totalPixels: number,
  changedPixels: number,
  threshold: number = 0.1,
  maskedPixelsExcluded: number = 0
): VisualDiffStatistics {
  const effectiveTotal = Math.max(1, totalPixels - maskedPixelsExcluded);
  const rawPercentage = (changedPixels / effectiveTotal) * 100;
  const differencePercentage = Number(rawPercentage.toFixed(3));

  let classification: VisualChangeClassification = 'visual_match';
  let label = 'No Visual Change (Visual Match)';

  if (differencePercentage > 10.0) {
    classification = 'significant_visual_difference';
    label = 'Significant Visual Difference (Layout / Content Shift)';
  } else if (differencePercentage > 0.0) {
    classification = 'minor_visual_difference';
    label = 'Minor Visual Difference (Styling / Anti-aliasing)';
  }

  return {
    totalPixels,
    changedPixels,
    differencePercentage,
    threshold,
    maskedPixelsExcluded,
    classification,
    label,
    disclaimer: VISUAL_DIFFERENCE_DISCLAIMER,
  };
}
