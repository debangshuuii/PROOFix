import type {
  SemanticVisionConfig,
} from '../types/semantic-vision.ts';
import type { PreparedVisionImage } from './image-preprocessor.ts';
import { SYSTEM_VISION_PROMPT } from './vision-config.ts';
import { redactSensitiveData } from '../security/redactor.ts';

export interface MultimodalVisionRequestOptions {
  baselineImage: PreparedVisionImage;
  candidateImage: PreparedVisionImage;
  prompt: string;
  config: SemanticVisionConfig;
  apiKey?: string;
  timeoutMs?: number;
  mockFetch?: typeof fetch;
}

export interface RawVisionApiResponse {
  rawText: string;
  usage?: { promptTokens?: number; candidatesTokens?: number };
  durationMs: number;
}

/**
 * Sanitizes errors to ensure API keys are never leaked in error messages.
 */
function sanitizeApiError(err: unknown, keyToRedact?: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  let safeMsg = redactSensitiveData(msg);
  if (keyToRedact && keyToRedact.length > 5) {
    safeMsg = safeMsg.split(keyToRedact).join('[REDACTED_API_KEY]');
  }
  return new Error(safeMsg);
}

/**
 * Executes a multimodal vision inspection comparing two screenshots.
 */
export async function queryMultimodalVision(
  options: MultimodalVisionRequestOptions
): Promise<RawVisionApiResponse> {
  const { baselineImage, candidateImage, prompt, config } = options;
  const timeoutMs = options.timeoutMs ?? 15000;
  const startTime = Date.now();

  // 1. Mock Provider for local development & air-gapped CI
  if (config.modelProvider === 'mock') {
    const mockJson = {
      defects: [
        {
          category: 'element_overlap',
          severity: 'high',
          title: 'Modal Obscures Primary Button',
          explanation: 'Navigation modal container directly covers the primary action button.',
          boundingBox: { x: 120, y: 350, width: 220, height: 60, unit: 'px' },
          confidenceScore: 92,
          suggestedRemediation: 'Adjust z-index or add backdrop dismiss listener.',
        },
      ],
      layoutShifts: [
        {
          culpritElement: 'header.hero',
          displacementPx: 80,
          direction: 'down',
          explanation: 'Hero banner loaded without explicit dimensions, shifting content down by 80px.',
        },
      ],
      overallScore: 88,
    };

    return {
      rawText: JSON.stringify(mockJson, null, 2),
      durationMs: 45,
      usage: { promptTokens: 320, candidatesTokens: 110 },
    };
  }

  // 2. Gemini API / Custom Endpoint Execution
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey && config.modelProvider !== 'custom_endpoint') {
    throw new Error(
      'Missing Gemini API key. Please configure GEMINI_API_KEY environment variable or select "mock" provider.'
    );
  }

  const model = config.modelName || (config.modelProvider === 'gemini_pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash');
  const url =
    config.modelProvider === 'custom_endpoint' && config.customEndpointUrl
      ? config.customEndpointUrl
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_VISION_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: baselineImage.mimeType,
              data: baselineImage.base64Data,
            },
          },
          {
            inlineData: {
              mimeType: candidateImage.mimeType,
              data: candidateImage.base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2, // Low temperature for deterministic visual QA analysis
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchImpl = options.mockFetch || fetch;

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Vision API responded with HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Vision API returned empty content or malformed candidate part');
    }

    return {
      rawText,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            candidatesTokens: data.usageMetadata.candidatesTokenCount,
          }
        : undefined,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    clearTimeout(timer);
    throw sanitizeApiError(err, apiKey);
  }
}
