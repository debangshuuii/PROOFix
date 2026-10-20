import type { LayoutShiftExplanation } from '../types/semantic-vision.ts';

export interface DomElementLayoutMetric {
  selector: string;
  tagName: string;
  classes?: string[];
  dimensions?: { width: number; height: number };
  attributes?: Record<string, string>;
  computedStyles?: Record<string, string>;
}

export interface DetailedLayoutShiftDiagnosis {
  id: string;
  culpritElement: string;
  displacementPx: number;
  direction: 'down' | 'up' | 'left' | 'right';
  probableRootCause:
    | 'missing_media_dimensions'
    | 'dynamically_injected_content'
    | 'webfont_swap_fout'
    | 'unconstrained_flex_or_grid'
    | 'unknown_structural_shift';
  explanation: string;
  recommendedFix: string;
  codeSnippetRemediation?: string;
  impactScore: number; // 0 to 100
}

/**
 * Analyzes visual layout shift in context of DOM element properties to pinpoint root cause.
 */
export function diagnoseLayoutShift(
  shift: LayoutShiftExplanation,
  domElements: DomElementLayoutMetric[] = []
): DetailedLayoutShiftDiagnosis {
  const displacement = shift.displacementPx;
  const direction = shift.direction;
  const culprit = shift.culpritElement || 'unknown-element';

  // Find matching element in DOM context if available
  const matchedElement = domElements.find(
    (el) =>
      el.selector === culprit ||
      culprit.includes(el.tagName) ||
      (el.classes && el.classes.some((c) => culprit.includes(c)))
  );

  let probableRootCause: DetailedLayoutShiftDiagnosis['probableRootCause'] = 'unknown_structural_shift';
  let explanation = shift.explanation;
  let recommendedFix = 'Ensure container reserves adequate space before assets load.';
  let codeSnippetRemediation: string | undefined = undefined;

  // 1. Check for missing image/video dimensions
  if (
    matchedElement?.tagName === 'IMG' ||
    matchedElement?.tagName === 'VIDEO' ||
    culprit.startsWith('img') ||
    culprit.includes('image') ||
    culprit.includes('video')
  ) {
    const hasExplicitDimensions =
      matchedElement?.attributes?.width && matchedElement?.attributes?.height;

    if (!hasExplicitDimensions) {
      probableRootCause = 'missing_media_dimensions';
      explanation = `The media element "${culprit}" was rendered without explicit width and height dimensions, displacing downstream page content ${displacement}px ${direction}.`;
      recommendedFix = 'Specify explicit width and height attributes or CSS aspect-ratio to reserve layout space.';
      codeSnippetRemediation = `<img src="..." width="800" height="400" className="w-full h-auto" style={{ aspectRatio: '16/9' }} />`;
    }
  }
  // 2. Check for dynamic banner or ad injection
  else if (
    culprit.includes('ad') ||
    culprit.includes('banner') ||
    culprit.includes('announcement') ||
    culprit.includes('cookie')
  ) {
    probableRootCause = 'dynamically_injected_content';
    explanation = `Dynamically injected banner or container "${culprit}" loaded asynchronously, pushing navigation ${displacement}px ${direction}.`;
    recommendedFix = 'Reserve static placeholder height with a skeleton loader or CSS min-height.';
    codeSnippetRemediation = `min-height: ${displacement}px; display: block;`;
  }
  // 3. Check for webfont swap
  else if (culprit.includes('font') || culprit.includes('text') || culprit.includes('h1') || culprit.includes('title')) {
    probableRootCause = 'webfont_swap_fout';
    explanation = `Webfont swap caused text reflow and vertical line-height expansion of ${displacement}px.`;
    recommendedFix = 'Use font-display: optional or match fallback font metrics with size-adjust.';
    codeSnippetRemediation = `@font-face {\n  font-family: 'CustomFont';\n  font-display: swap;\n  size-adjust: 100%;\n}`;
  }

  // Calculate severity impact score based on pixel displacement
  const impactScore = Math.min(100, Math.round((displacement / 250) * 100));

  return {
    id: `shift_diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    culpritElement: culprit,
    displacementPx: displacement,
    direction,
    probableRootCause,
    explanation,
    recommendedFix,
    codeSnippetRemediation,
    impactScore,
  };
}

/**
 * Aggregates multiple layout shift diagnoses into a cumulative visual stability summary.
 */
export function aggregateLayoutShiftDiagnoses(
  diagnoses: DetailedLayoutShiftDiagnosis[]
): {
  totalDisplacementPx: number;
  highestSeverityDiagnosis?: DetailedLayoutShiftDiagnosis;
  causesBreakdown: Record<string, number>;
  exceedsStabilityBudget: boolean;
} {
  let totalDisplacementPx = 0;
  let highestSeverityDiagnosis: DetailedLayoutShiftDiagnosis | undefined = undefined;
  const causesBreakdown: Record<string, number> = {};

  for (const diag of diagnoses) {
    totalDisplacementPx += diag.displacementPx;
    causesBreakdown[diag.probableRootCause] = (causesBreakdown[diag.probableRootCause] || 0) + 1;

    if (!highestSeverityDiagnosis || diag.displacementPx > highestSeverityDiagnosis.displacementPx) {
      highestSeverityDiagnosis = diag;
    }
  }

  // Budget threshold: total displacement > 80px triggers stability gate failure
  const exceedsStabilityBudget = totalDisplacementPx > 80;

  return {
    totalDisplacementPx,
    highestSeverityDiagnosis,
    causesBreakdown,
    exceedsStabilityBudget,
  };
}
