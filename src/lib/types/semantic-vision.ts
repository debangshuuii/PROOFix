/**
 * Type definitions for Semantic Vision-AI Visual Regression & Human-Like Defect Detection
 * Feature: Contributions 111–120 (Point 2)
 */

export type SemanticDefectCategory =
  | 'text_clipping'
  | 'element_overlap'
  | 'broken_image_placeholder'
  | 'navigation_obscuration'
  | 'unexpected_layout_shift'
  | 'contrast_anomaly'
  | 'unrendered_content';

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  unit?: 'px' | 'percent';
}

export interface SemanticVisualDefect {
  id: string;
  category: SemanticDefectCategory;
  severity: DefectSeverity;
  title: string;
  explanation: string;
  boundingBox?: BoundingBox;
  confidenceScore: number; // 0 to 100
  suggestedRemediation?: string;
  dismissed?: boolean;
}

export interface LayoutShiftExplanation {
  culpritElement?: string;
  displacementPx: number;
  direction: 'down' | 'up' | 'left' | 'right';
  explanation: string;
}

export type VisionModelProvider =
  | 'gemini_flash'
  | 'gemini_pro'
  | 'custom_endpoint'
  | 'mock';

export interface SemanticVisionConfig {
  enabled: boolean;
  modelProvider: VisionModelProvider;
  modelName?: string;
  minConfidenceThreshold: number; // 0 to 100
  ignoreSubpixelAntiAliasing: boolean;
  allowedDefectCategories: SemanticDefectCategory[];
  maxDefectsPerScreen: number;
  customEndpointUrl?: string;
}

export interface SemanticVisionAuditResult {
  id: string;
  runId: string;
  testId?: string;
  baselineImageUrl: string;
  candidateImageUrl: string;
  defects: SemanticVisualDefect[];
  layoutShifts: LayoutShiftExplanation[];
  overallScore: number; // 0 to 100
  hasVisualRegressions: boolean;
  evaluatedAt: string;
}
