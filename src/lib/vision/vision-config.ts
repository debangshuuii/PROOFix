import type {
  SemanticVisionConfig,
  VisionModelProvider,
  SemanticDefectCategory,
} from '../types/semantic-vision.ts';

export const ALL_SEMANTIC_DEFECT_CATEGORIES: SemanticDefectCategory[] = [
  'text_clipping',
  'element_overlap',
  'broken_image_placeholder',
  'navigation_obscuration',
  'unexpected_layout_shift',
  'contrast_anomaly',
  'unrendered_content',
];

export const DEFAULT_SEMANTIC_VISION_CONFIG: SemanticVisionConfig = {
  enabled: false, // Safe default: must be explicitly activated
  modelProvider: 'gemini_flash',
  modelName: 'gemini-1.5-flash',
  minConfidenceThreshold: 75,
  ignoreSubpixelAntiAliasing: true,
  allowedDefectCategories: [...ALL_SEMANTIC_DEFECT_CATEGORIES],
  maxDefectsPerScreen: 10,
};

export const SYSTEM_VISION_PROMPT = `
You are a Senior Principal UI/UX Quality Engineer inspecting browser screenshots for semantic visual regressions.
Traditional pixel diffs fail on font anti-aliasing and 1px shifts; your goal is to spot real human-perceivable visual defects.

Focus strictly on these defect categories:
1. text_clipping: Text cut off by container bounds, ellipsis overflows, or truncated headers.
2. element_overlap: Buttons, text blocks, or cards unintentionally overlapping each other.
3. broken_image_placeholder: Missing image icons, empty gray boxes, or broken asset indicators.
4. navigation_obscuration: Modals, fixed bars, or cookies obscuring interactive CTA buttons or form inputs.
5. unexpected_layout_shift: Unintended gross layout displacements caused by unconstrained media or missing dimensions.
6. contrast_anomaly: Unreadable low-contrast text against bright or dark backgrounds.
7. unrendered_content: Blank content areas, raw template placeholders (e.g. {{name}} or undefined), or un-hydrated React skeletons.

Respond strictly with valid JSON conforming to the requested schema.
`.trim();

/**
 * Returns a clean copy of default configuration.
 */
export function getDefaultSemanticVisionConfig(): SemanticVisionConfig {
  return {
    ...DEFAULT_SEMANTIC_VISION_CONFIG,
    allowedDefectCategories: [...DEFAULT_SEMANTIC_VISION_CONFIG.allowedDefectCategories],
  };
}

/**
 * Validates and sanitizes semantic vision configuration with safe clamping bounds.
 */
export function validateSemanticVisionConfig(raw: Partial<SemanticVisionConfig> = {}): {
  valid: boolean;
  config: SemanticVisionConfig;
  errors: string[];
} {
  const errors: string[] = [];
  const base = getDefaultSemanticVisionConfig();

  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled;

  const validProviders: VisionModelProvider[] = [
    'gemini_flash',
    'gemini_pro',
    'custom_endpoint',
    'mock',
  ];
  let modelProvider = base.modelProvider;
  if (raw.modelProvider) {
    if (validProviders.includes(raw.modelProvider)) {
      modelProvider = raw.modelProvider;
    } else {
      errors.push(`Invalid modelProvider "${raw.modelProvider}". Allowed: ${validProviders.join(', ')}`);
    }
  }

  let minConfidenceThreshold = base.minConfidenceThreshold;
  if (typeof raw.minConfidenceThreshold === 'number') {
    if (raw.minConfidenceThreshold < 10 || raw.minConfidenceThreshold > 100) {
      errors.push('minConfidenceThreshold must be between 10 and 100');
    }
    minConfidenceThreshold = Math.max(10, Math.min(100, Math.round(raw.minConfidenceThreshold)));
  }

  let maxDefectsPerScreen = base.maxDefectsPerScreen;
  if (typeof raw.maxDefectsPerScreen === 'number') {
    if (raw.maxDefectsPerScreen < 1 || raw.maxDefectsPerScreen > 50) {
      errors.push('maxDefectsPerScreen must be between 1 and 50');
    }
    maxDefectsPerScreen = Math.max(1, Math.min(50, Math.round(raw.maxDefectsPerScreen)));
  }

  const ignoreSubpixelAntiAliasing =
    typeof raw.ignoreSubpixelAntiAliasing === 'boolean'
      ? raw.ignoreSubpixelAntiAliasing
      : base.ignoreSubpixelAntiAliasing;

  let allowedDefectCategories = base.allowedDefectCategories;
  if (Array.isArray(raw.allowedDefectCategories)) {
    const filtered = raw.allowedDefectCategories.filter((cat) =>
      ALL_SEMANTIC_DEFECT_CATEGORIES.includes(cat)
    );
    if (filtered.length > 0) {
      allowedDefectCategories = filtered;
    }
  }

  const modelName = raw.modelName || base.modelName;
  const customEndpointUrl = raw.customEndpointUrl;

  if (modelProvider === 'custom_endpoint' && !customEndpointUrl) {
    errors.push('customEndpointUrl is required when modelProvider is "custom_endpoint"');
  }

  return {
    valid: errors.length === 0,
    config: {
      enabled,
      modelProvider,
      modelName,
      minConfidenceThreshold,
      ignoreSubpixelAntiAliasing,
      allowedDefectCategories,
      maxDefectsPerScreen,
      customEndpointUrl,
    },
    errors,
  };
}

/**
 * Builds structured comparison prompt for multimodal vision model.
 */
export function buildVisionComparisonPrompt(options: {
  viewport?: { width: number; height: number };
  routePath?: string;
  knownInteractiveTargets?: string[];
}): string {
  const vp = options.viewport ? `at resolution ${options.viewport.width}x${options.viewport.height}` : '';
  const route = options.routePath ? `on route "${options.routePath}"` : '';
  const targets = options.knownInteractiveTargets?.length
    ? `\nKey interactive elements to check: ${options.knownInteractiveTargets.join(', ')}`
    : '';

  return `Compare Image 1 (Baseline Golden Master) with Image 2 (Candidate Run) ${route} ${vp}.${targets}
Identify any semantic UI flaws where Candidate degrades compared to Baseline.
Ignore minor subpixel anti-aliasing variations and slight font smoothing differences.

Return a JSON object in this format:
{
  "defects": [
    {
      "category": "element_overlap",
      "severity": "critical",
      "title": "Modal obscuring Checkout Button",
      "explanation": "Human-readable explanation of why this is a bug",
      "boundingBox": { "x": 100, "y": 200, "width": 150, "height": 50, "unit": "px" },
      "confidenceScore": 95,
      "suggestedRemediation": "Add proper z-index or modal backdrop dismissal"
    }
  ],
  "layoutShifts": [
    {
      "culpritElement": "img.hero-banner",
      "displacementPx": 120,
      "direction": "down",
      "explanation": "The banner image was uploaded without explicit height, displacing content 120px down."
    }
  ],
  "overallScore": 92
}`;
}
