import type {
  SemanticVisionConfig,
  SemanticVisionAuditResult,
} from '../types/semantic-vision.ts';
import {
  validateSemanticVisionConfig,
  buildVisionComparisonPrompt,
} from './vision-config.ts';
import { prepareVisionImage } from './image-preprocessor.ts';
import { preFilterVisualDifferences } from './semantic-comparator.ts';
import { queryMultimodalVision } from './multimodal-client.ts';
import { classifyVisionDefects } from './defect-classifier.ts';
import {
  diagnoseLayoutShift,
  type DomElementLayoutMetric,
} from './layout-shift-explainer.ts';

export interface VisionAuditServiceOptions {
  runId: string;
  testId?: string;
  baselineImage: string | Buffer;
  candidateImage: string | Buffer;
  config?: Partial<SemanticVisionConfig>;
  domContext?: DomElementLayoutMetric[];
  routePath?: string;
  viewport?: { width: number; height: number };
  apiKey?: string;
  mockFetch?: typeof fetch;
}

/**
 * High-level service orchestrating the full semantic vision audit lifecycle.
 */
export async function runSemanticVisionAudit(
  options: VisionAuditServiceOptions
): Promise<SemanticVisionAuditResult> {
  const { config: rawConfig, baselineImage, candidateImage, runId, testId } = options;

  // 1. Validate & clamp configuration
  const { config } = validateSemanticVisionConfig(rawConfig);

  // 2. Prepare images and extract dimension metadata
  const preparedBaseline = prepareVisionImage(baselineImage);
  const preparedCandidate = prepareVisionImage(candidateImage);

  const screenDims = {
    width: preparedCandidate.metadata.width || preparedBaseline.metadata.width || 1280,
    height: preparedCandidate.metadata.height || preparedBaseline.metadata.height || 800,
  };

  // 3. Fast pre-filter: Check if differences are macroscopic or harmless anti-aliasing
  const rawBaselineBuf = Buffer.from(preparedBaseline.base64Data, 'base64');
  const rawCandidateBuf = Buffer.from(preparedCandidate.base64Data, 'base64');

  const preFilter = preFilterVisualDifferences(
    rawBaselineBuf,
    rawCandidateBuf,
    screenDims.width,
    screenDims.height,
    {
      colorDistanceThreshold: 16,
      minPixelChangeForAi: 30,
    }
  );

  const evaluatedAt = new Date().toISOString();
  const resultId = `vis_audit_${runId}_${Date.now()}`;

  // If identical or purely subpixel font smoothing noise, bypass vision API
  if (!preFilter.needsVisionAiEvaluation) {
    return {
      id: resultId,
      runId,
      testId,
      baselineImageUrl: preparedBaseline.dataUrl,
      candidateImageUrl: preparedCandidate.dataUrl,
      defects: [],
      layoutShifts: [],
      overallScore: 100,
      hasVisualRegressions: false,
      evaluatedAt,
    };
  }

  // 4. Formulate structured comparison prompt
  const prompt = buildVisionComparisonPrompt({
    viewport: options.viewport || screenDims,
    routePath: options.routePath,
  });

  // 5. Query multimodal vision model
  const rawResponse = await queryMultimodalVision({
    baselineImage: preparedBaseline,
    candidateImage: preparedCandidate,
    prompt,
    config,
    apiKey: options.apiKey,
    mockFetch: options.mockFetch,
  });

  // 6. Classify defects and extract layout shifts
  const parsedAudit = classifyVisionDefects(rawResponse.rawText, screenDims, config);

  // 7. Correlate layout shifts with DOM context if provided
  const enrichedShifts = parsedAudit.layoutShifts.map((shift) => {
    const diagnosis = diagnoseLayoutShift(shift, options.domContext);
    return {
      culpritElement: diagnosis.culpritElement,
      displacementPx: diagnosis.displacementPx,
      direction: diagnosis.direction,
      explanation: `${diagnosis.explanation} Fix: ${diagnosis.recommendedFix}`,
    };
  });

  return {
    id: resultId,
    runId,
    testId,
    baselineImageUrl: preparedBaseline.dataUrl,
    candidateImageUrl: preparedCandidate.dataUrl,
    defects: parsedAudit.defects,
    layoutShifts: enrichedShifts,
    overallScore: parsedAudit.overallScore,
    hasVisualRegressions: parsedAudit.hasVisualRegressions,
    evaluatedAt,
  };
}
