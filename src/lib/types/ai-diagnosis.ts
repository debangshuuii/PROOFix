/**
 * Multi-Provider AI Diagnosis & Sanitized Prompt Context Schemas (Contribution 1)
 *
 * Provides domain contracts for multi-model LLM diagnosis, sanitized prompt synthesis,
 * resilient JSON parsing results, and structured finding generation across Gemini,
 * Anthropic Claude, OpenAI, and local air-gapped LLM endpoints (Ollama, vLLM).
 */

export type AiModelProvider =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'local_ollama'
  | 'local_vllm'
  | 'deterministic';

export interface AnthropicModelConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiVersion?: string;
}

export interface LocalAiModelConfig {
  baseUrl: string;
  modelName: string;
  apiKey?: string;
  timeoutMs: number;
  temperature: number;
}

export interface SourceSnippetContext {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  isTargetComponent: boolean;
}

export interface DiagnosisPromptContext {
  runId: string;
  testId: string;
  testName: string;
  failureCategory: string;
  actualResult: string;
  errorDetails?: {
    message?: string;
    url?: string;
    stepFailed?: string;
    stack?: string;
  };
  consoleErrors: Array<{
    timestamp?: string;
    type: string;
    text: string;
    location?: string;
  }>;
  networkFailures: Array<{
    url: string;
    method?: string;
    status?: number;
    failureReason?: string;
  }>;
  sourceSnippets: SourceSnippetContext[];
  framework: string;
  runtime: string;
  redactedTokensCount: number;
  tokenBudgetRemaining?: number;
}

export type JsonExtractionStrategy =
  | 'direct'
  | 'markdown_fence'
  | 'balanced_brace'
  | 'regex_heuristic'
  | 'failed';

export interface JsonExtractionResult<T = any> {
  success: boolean;
  data?: T;
  rawText: string;
  cleanedJson?: string;
  parseError?: string;
  extractorStrategyUsed: JsonExtractionStrategy;
  durationMs: number;
}

export interface StructuredDiagnosisPayload {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  observedEvidence: string;
  aiHypothesis: string;
  suggestedFix: string;
  patchPreview?: string;
  affectedFiles: string[];
  sideEffects?: string;
  verificationStep?: string;
  confidenceScore: number;
}
