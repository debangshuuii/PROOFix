import type {
  SemanticVisualDefect,
  LayoutShiftExplanation,
  SemanticDefectCategory,
  DefectSeverity,
  SemanticVisionConfig,
} from '../types/semantic-vision.ts';
import { ALL_SEMANTIC_DEFECT_CATEGORIES } from './vision-config.ts';
import { normalizeBoundingBox } from './image-preprocessor.ts';

export interface ParsedVisionAudit {
  defects: SemanticVisualDefect[];
  layoutShifts: LayoutShiftExplanation[];
  overallScore: number;
  hasVisualRegressions: boolean;
  parseErrors: string[];
}

/**
 * Extracts raw JSON substring from LLM response text, handling markdown fences.
 */
export function extractJsonFromModelOutput(text: string): string {
  const trimmed = text.trim();

  // Handle ```json ... ``` or ``` ... ``` code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Handle bare JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.substring(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * Normalizes defect severity.
 */
function normalizeSeverity(rawSeverity: unknown): DefectSeverity {
  const str = String(rawSeverity || '').toLowerCase().trim();
  if (str === 'critical' || str === 'blocker') return 'critical';
  if (str === 'high' || str === 'major') return 'high';
  if (str === 'medium' || str === 'moderate') return 'medium';
  if (str === 'low' || str === 'minor') return 'low';
  return 'info';
}

/**
 * Normalizes defect category to recognized enum.
 */
function normalizeCategory(rawCat: unknown): SemanticDefectCategory {
  const str = String(rawCat || '').toLowerCase().trim();
  const match = ALL_SEMANTIC_DEFECT_CATEGORIES.find((c) => c === str);
  if (match) return match;

  if (str.includes('clip') || str.includes('truncat') || str.includes('overflow')) {
    return 'text_clipping';
  }
  if (str.includes('overlap') || str.includes('obscur') || str.includes('cover')) {
    return 'element_overlap';
  }
  if (str.includes('image') || str.includes('placeholder') || str.includes('broken')) {
    return 'broken_image_placeholder';
  }
  if (str.includes('shift') || str.includes('layout')) {
    return 'unexpected_layout_shift';
  }
  if (str.includes('contrast') || str.includes('color')) {
    return 'contrast_anomaly';
  }
  return 'unrendered_content';
}

/**
 * Parses raw multimodal vision model output into validated, structured defects and layout shifts.
 */
export function classifyVisionDefects(
  rawModelText: string,
  imageDimensions: { width: number; height: number },
  config: SemanticVisionConfig
): ParsedVisionAudit {
  const parseErrors: string[] = [];
  let parsedJson: any = null;

  try {
    const jsonStr = extractJsonFromModelOutput(rawModelText);
    parsedJson = JSON.parse(jsonStr);
  } catch (err: any) {
    parseErrors.push(`Failed to parse model output as JSON: ${err.message}`);
    return {
      defects: [],
      layoutShifts: [],
      overallScore: 50,
      hasVisualRegressions: true,
      parseErrors,
    };
  }

  const rawDefects: any[] = Array.isArray(parsedJson?.defects) ? parsedJson.defects : [];
  const rawLayoutShifts: any[] = Array.isArray(parsedJson?.layoutShifts) ? parsedJson.layoutShifts : [];

  const defects: SemanticVisualDefect[] = [];

  for (let i = 0; i < rawDefects.length; i++) {
    const raw = rawDefects[i];
    const category = normalizeCategory(raw.category);

    // Filter by allowed categories
    if (!config.allowedDefectCategories.includes(category)) {
      continue;
    }

    const confidenceScore = typeof raw.confidenceScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(raw.confidenceScore)))
      : 80;

    // Filter out hallucinations below confidence threshold
    if (confidenceScore < config.minConfidenceThreshold) {
      continue;
    }

    const severity = normalizeSeverity(raw.severity);
    const title = String(raw.title || `${category.replace(/_/g, ' ')} detected`).trim();
    const explanation = String(raw.explanation || 'Semantic visual discrepancy detected.').trim();
    const suggestedRemediation = raw.suggestedRemediation ? String(raw.suggestedRemediation).trim() : undefined;

    let boundingBox = undefined;
    if (raw.boundingBox && typeof raw.boundingBox.x === 'number') {
      boundingBox = normalizeBoundingBox(raw.boundingBox, imageDimensions, 'px');
    }

    defects.push({
      id: `vis_def_${Date.now()}_${i + 1}`,
      category,
      severity,
      title,
      explanation,
      boundingBox,
      confidenceScore,
      suggestedRemediation,
    });

    if (defects.length >= config.maxDefectsPerScreen) {
      break;
    }
  }

  const layoutShifts: LayoutShiftExplanation[] = [];
  for (const rawShift of rawLayoutShifts) {
    const displacementPx = typeof rawShift.displacementPx === 'number' ? Math.round(rawShift.displacementPx) : 0;
    const direction = ['down', 'up', 'left', 'right'].includes(rawShift.direction)
      ? rawShift.direction
      : 'down';
    const explanation = String(rawShift.explanation || `Layout shifted by ${displacementPx}px ${direction}`).trim();

    layoutShifts.push({
      culpritElement: rawShift.culpritElement ? String(rawShift.culpritElement) : undefined,
      displacementPx,
      direction,
      explanation,
    });
  }

  // Calculate score penalties
  let scoreDeductions = 0;
  for (const defect of defects) {
    if (defect.severity === 'critical') scoreDeductions += 30;
    else if (defect.severity === 'high') scoreDeductions += 15;
    else if (defect.severity === 'medium') scoreDeductions += 8;
    else if (defect.severity === 'low') scoreDeductions += 3;
  }
  for (const shift of layoutShifts) {
    if (shift.displacementPx > 100) scoreDeductions += 15;
    else if (shift.displacementPx > 30) scoreDeductions += 8;
  }

  const overallScore = Math.max(0, Math.min(100, 100 - scoreDeductions));
  const hasVisualRegressions = defects.some(
    (d) => d.severity === 'critical' || d.severity === 'high' || d.severity === 'medium'
  ) || layoutShifts.some((s) => s.displacementPx >= 40);

  return {
    defects,
    layoutShifts,
    overallScore,
    hasVisualRegressions,
    parseErrors,
  };
}
