/**
 * Local Air-Gapped & OpenAI-Compatible Failure Diagnoser (Contribution 4)
 *
 * Provides air-gapped diagnosis for privacy-sensitive enterprise environments running
 * local Ollama, vLLM, LM Studio, or LocalAI servers via standard chat completion endpoints.
 */

import type { Finding, TestResult } from '../types/index.ts';
import type { LocalAiModelConfig, StructuredDiagnosisPayload } from '../types/ai-diagnosis.ts';
import { LlmJsonExtractor } from './llm-json-extractor.ts';

export interface LocalAiDiagnosisOptions {
  runId: string;
  testResult: TestResult;
  config: LocalAiModelConfig;
  fetchImpl?: typeof fetch;
}

export const DEFAULT_LOCAL_AI_CONFIG: LocalAiModelConfig = {
  baseUrl: 'http://localhost:11434/v1',
  modelName: 'llama3.2:latest',
  timeoutMs: 30000,
  temperature: 0.1,
};

export async function callLocalAiDiagnosis(
  options: LocalAiDiagnosisOptions
): Promise<Finding> {
  const { runId, testResult, config, fetchImpl = fetch } = options;
  const baseUrl = (config.baseUrl || DEFAULT_LOCAL_AI_CONFIG.baseUrl).replace(/\/+$/, '');
  const model = config.modelName || DEFAULT_LOCAL_AI_CONFIG.modelName;
  const timeoutMs = config.timeoutMs || DEFAULT_LOCAL_AI_CONFIG.timeoutMs;

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  const systemPrompt = `You are PROOFix Local AI Failure Diagnoser running in an air-gapped environment.
Analyze the provided test failure and output ONLY a valid JSON object with no prefix or conversational text.

Required JSON format:
{
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "title": string,
  "description": string,
  "observedEvidence": string,
  "aiHypothesis": string,
  "suggestedFix": string,
  "patchPreview": string,
  "affectedFiles": string[],
  "sideEffects": string,
  "verificationStep": string,
  "confidenceScore": number
}`;

  const userPrompt = `FAILURE EVIDENCE:
Check Name: ${testResult.name}
Category: ${testResult.category}
Error Message: ${testResult.actualResult}
Error Details: ${JSON.stringify(testResult.errorDetails || {})}
Console Errors: ${JSON.stringify(testResult.evidence.consoleErrors || [])}
Network Status: ${JSON.stringify(testResult.evidence.networkFailures || [])}`;

  try {
    const endpoint = `${baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature ?? DEFAULT_LOCAL_AI_CONFIG.temperature,
        response_format: { type: 'json_object' },
      }),
    });

    clearTimeout(timeoutTimer);

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Local AI endpoint (${endpoint}) returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    const extraction = LlmJsonExtractor.extract<StructuredDiagnosisPayload>(rawContent);
    if (!extraction.success || !extraction.data) {
      throw new Error(`Local model failed to generate parseable JSON: ${extraction.parseError}`);
    }

    const parsed = extraction.data;
    const findingId = `fnd_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: findingId,
      runId,
      testResultId: testResult.id,
      severity: parsed.severity || 'high',
      title: parsed.title || `Local AI Diagnosis: ${testResult.name}`,
      description: parsed.description || testResult.actualResult,
      observedEvidence: parsed.observedEvidence || testResult.actualResult,
      aiHypothesis: parsed.aiHypothesis || 'Failure caused by application runtime discrepancy.',
      suggestedFix: parsed.suggestedFix || 'Review target routes and assertions.',
      patchPreview: parsed.patchPreview,
      affectedFiles: parsed.affectedFiles || [],
      sideEffects: parsed.sideEffects || 'Local verification fix.',
      verificationStep: parsed.verificationStep || 'Re-run targeted check.',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.min(100, Math.max(0, parsed.confidenceScore)) : 80,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (err.name === 'AbortError') {
      throw new Error(`Local AI server timed out after ${timeoutMs}ms at ${baseUrl}`);
    }
    throw err;
  }
}
