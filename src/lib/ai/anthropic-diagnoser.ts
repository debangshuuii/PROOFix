/**
 * Anthropic Claude 3.5 Sonnet & Haiku Failure Diagnoser (Contribution 3)
 *
 * Formulates structured root-cause failure diagnoses and surgical patch previews
 * using the Anthropic Messages API with resilient JSON extraction and fallback guards.
 */

import type { Finding, TestResult } from '../types/index.ts';
import type { AnthropicModelConfig, StructuredDiagnosisPayload } from '../types/ai-diagnosis.ts';
import { LlmJsonExtractor } from './llm-json-extractor.ts';

export interface AnthropicDiagnosisOptions {
  runId: string;
  testResult: TestResult;
  config: AnthropicModelConfig;
  fetchImpl?: typeof fetch;
}

export const DEFAULT_ANTHROPIC_CONFIG: AnthropicModelConfig = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 2500,
  temperature: 0.1,
  apiVersion: '2023-06-01',
};

export async function callAnthropicDiagnosis(
  options: AnthropicDiagnosisOptions
): Promise<Finding> {
  const { runId, testResult, config, fetchImpl = fetch } = options;

  if (!config.apiKey) {
    throw new Error('Anthropic API key is not configured in settings or environment.');
  }

  const systemPrompt = `You are PROOFix AI Failure Diagnoser.
Analyze the provided web application browser test failure evidence and output a strictly valid JSON object.
Do NOT hallucinate or guess non-existent files. Ground all hypotheses strictly in observed evidence.

Output schema:
{
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "title": string,
  "description": string,
  "observedEvidence": string,
  "aiHypothesis": string,
  "suggestedFix": string,
  "patchPreview": string (unified diff format --- a/... +++ b/...),
  "affectedFiles": string[],
  "sideEffects": string,
  "verificationStep": string,
  "confidenceScore": number (0 to 100)
}`;

  const userPrompt = `TEST FAILURE DETAILS:
Name: ${testResult.name}
Category: ${testResult.category}
Status: ${testResult.status}
Actual Result: ${testResult.actualResult}
Error Details: ${JSON.stringify(testResult.errorDetails || {}, null, 2)}
Console Errors: ${JSON.stringify(testResult.evidence.consoleErrors || [], null, 2)}
Network Failures: ${JSON.stringify(testResult.evidence.networkFailures || [], null, 2)}
Failed Steps: ${JSON.stringify((testResult.evidence.steps || []).filter((s) => s.status === 'failed'), null, 2)}

Provide your diagnosis in strictly valid JSON format.`;

  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': config.apiVersion || '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_ANTHROPIC_CONFIG.model,
      max_tokens: config.maxTokens || DEFAULT_ANTHROPIC_CONFIG.maxTokens,
      temperature: config.temperature ?? DEFAULT_ANTHROPIC_CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const responseJson = await response.json();
  const rawContent = responseJson.content?.[0]?.text || '';

  const extraction = LlmJsonExtractor.extract<StructuredDiagnosisPayload>(rawContent);
  if (!extraction.success || !extraction.data) {
    throw new Error(`Failed to extract valid diagnosis JSON from Claude response: ${extraction.parseError}`);
  }

  const parsed = extraction.data;
  const findingId = `fnd_claude_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: findingId,
    runId,
    testResultId: testResult.id,
    severity: parsed.severity || 'high',
    title: parsed.title || `Failure Diagnosis: ${testResult.name}`,
    description: parsed.description || testResult.actualResult,
    observedEvidence: parsed.observedEvidence || testResult.actualResult,
    aiHypothesis: parsed.aiHypothesis || 'An unexpected runtime or routing invariant was violated.',
    suggestedFix: parsed.suggestedFix || 'Review the affected code and verify the test assertion.',
    patchPreview: parsed.patchPreview,
    affectedFiles: parsed.affectedFiles || [],
    sideEffects: parsed.sideEffects || 'Resolves target browser failure.',
    verificationStep: parsed.verificationStep || 'Re-run targeted check to confirm resolution.',
    confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.min(100, Math.max(0, parsed.confidenceScore)) : 88,
    reviewStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}
