/**
 * Resilient JSON Parser & Markdown Codeblock Extractor for LLM Outputs (Contribution 2)
 *
 * Reliably extracts and normalizes valid JSON from LLM responses that may be wrapped
 * in Markdown codeblocks (```json ... ```), preceded by conversational chatter,
 * or afflicted with trailing commas and unescaped control characters.
 */

import type { JsonExtractionResult, JsonExtractionStrategy } from '../types/ai-diagnosis.ts';

export class LlmJsonExtractor {
  /**
   * Extracts and parses JSON from raw LLM output using multi-tier fallback strategies.
   */
  public static extract<T = any>(rawText: string | null | undefined): JsonExtractionResult<T> {
    const start = Date.now();
    const text = (rawText || '').trim();

    if (!text) {
      return {
        success: false,
        rawText: text,
        extractorStrategyUsed: 'failed',
        parseError: 'Input text is empty or null',
        durationMs: Date.now() - start,
      };
    }

    // Strategy 1: Direct JSON parsing
    try {
      const parsed = JSON.parse(text);
      return {
        success: true,
        data: parsed as T,
        rawText: text,
        cleanedJson: text,
        extractorStrategyUsed: 'direct',
        durationMs: Date.now() - start,
      };
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Markdown fence extraction (```json ... ``` or ``` ... ```)
    const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(markdownRegex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      try {
        const parsed = JSON.parse(candidate);
        return {
          success: true,
          data: parsed as T,
          rawText: text,
          cleanedJson: candidate,
          extractorStrategyUsed: 'markdown_fence',
          durationMs: Date.now() - start,
        };
      } catch {
        // Markdown fence matched but inner text had syntax defect; try repairing
        const repaired = this.sanitizeJsonString(candidate);
        try {
          const parsed = JSON.parse(repaired);
          return {
            success: true,
            data: parsed as T,
            rawText: text,
            cleanedJson: repaired,
            extractorStrategyUsed: 'markdown_fence',
            durationMs: Date.now() - start,
          };
        } catch {
          // Fall through
        }
      }
    }

    // Strategy 3: Balanced Brace Extractor (finding first '{' and corresponding matching '}')
    const braceExtracted = this.extractBalancedObject(text);
    if (braceExtracted) {
      try {
        const parsed = JSON.parse(braceExtracted);
        return {
          success: true,
          data: parsed as T,
          rawText: text,
          cleanedJson: braceExtracted,
          extractorStrategyUsed: 'balanced_brace',
          durationMs: Date.now() - start,
        };
      } catch {
        const repaired = this.sanitizeJsonString(braceExtracted);
        try {
          const parsed = JSON.parse(repaired);
          return {
            success: true,
            data: parsed as T,
            rawText: text,
            cleanedJson: repaired,
            extractorStrategyUsed: 'balanced_brace',
            durationMs: Date.now() - start,
          };
        } catch {
          // Fall through
        }
      }
    }

    // Strategy 4: Regex-based outer object discovery
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = text.substring(firstBrace, lastBrace + 1);
      const repaired = this.sanitizeJsonString(slice);
      try {
        const parsed = JSON.parse(repaired);
        return {
          success: true,
          data: parsed as T,
          rawText: text,
          cleanedJson: repaired,
          extractorStrategyUsed: 'regex_heuristic',
          durationMs: Date.now() - start,
        };
      } catch (err: any) {
        return {
          success: false,
          rawText: text,
          cleanedJson: repaired,
          extractorStrategyUsed: 'failed',
          parseError: `JSON heuristic repair failed: ${err.message}`,
          durationMs: Date.now() - start,
        };
      }
    }

    return {
      success: false,
      rawText: text,
      extractorStrategyUsed: 'failed',
      parseError: 'No valid JSON object structure found in response',
      durationMs: Date.now() - start,
    };
  }

  /**
   * Discovers the outermost balanced JSON object in a string.
   */
  public static extractBalancedObject(input: string): string | null {
    const startIndex = input.indexOf('{');
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < input.length; i++) {
      const char = input[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            return input.substring(startIndex, i + 1);
          }
        }
      }
    }

    return null;
  }

  /**
   * Sanitizes common LLM JSON defects like trailing commas, single quotes, and control chars.
   */
  public static sanitizeJsonString(jsonStr: string): string {
    return jsonStr
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*([}\]])/g, '$1')
      // Remove non-printable control characters except tabs and newlines
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}
