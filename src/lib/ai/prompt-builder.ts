/**
 * Diagnosis Prompt Builder with Source AST Context & Token Budgeter (Contribution 5)
 *
 * Formulates token-bounded, sanitized failure analysis prompts prioritizing actionable
 * failure signatures, stack traces, and relevant source snippets while respecting token limits.
 */

import type { DiagnosisPromptContext, SourceSnippetContext } from '../types/ai-diagnosis.ts';

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
  truncated: boolean;
  preservedSections: string[];
}

export class DiagnosisPromptBuilder {
  public static readonly DEFAULT_MAX_TOKEN_BUDGET = 4000;

  /**
   * Estimates token count based on typical ~4 chars per token heuristic.
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Builds an optimized prompt that fits strictly within the specified token budget.
   */
  public static buildPrompt(
    context: DiagnosisPromptContext,
    maxTokenBudget: number = DiagnosisPromptBuilder.DEFAULT_MAX_TOKEN_BUDGET
  ): BuiltPrompt {
    const systemPrompt = `You are PROOFix AI Failure Diagnoser.
Analyze the provided web application browser test failure evidence and output a strictly valid JSON object.
Do NOT hallucinate facts or propose changes to unaffected files. Formulate factual, verifiable diagnoses.

Output JSON format:
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

    const preservedSections: string[] = ['core_failure_metadata'];
    let truncated = false;

    // 1. Mandatory Core Failure Signature
    let userPromptParts: string[] = [
      `### TEST FAILURE SIGNATURE`,
      `Test Name: ${context.testName}`,
      `Category: ${context.failureCategory}`,
      `Actual Result: ${context.actualResult}`,
      `Framework: ${context.framework} | Runtime: ${context.runtime}`,
    ];

    if (context.errorDetails?.message) {
      userPromptParts.push(`Error Message: ${context.errorDetails.message}`);
    }
    if (context.errorDetails?.url) {
      userPromptParts.push(`Target URL: ${context.errorDetails.url}`);
    }
    if (context.errorDetails?.stepFailed) {
      userPromptParts.push(`Failed Step: ${context.errorDetails.stepFailed}`);
    }

    let currentTokens = this.estimateTokens(systemPrompt) + this.estimateTokens(userPromptParts.join('\n'));

    // 2. Add Network Failures (High Priority)
    if (context.networkFailures && context.networkFailures.length > 0) {
      const netSection = [
        `\n### NETWORK FAILURES (${context.networkFailures.length})`,
        ...context.networkFailures.slice(0, 5).map((n) => `  - [${n.method || 'GET'}] ${n.url} -> Status: ${n.status || 'Failed'} (${n.failureReason || 'Drop'})`),
      ].join('\n');

      const netTokens = this.estimateTokens(netSection);
      if (currentTokens + netTokens <= maxTokenBudget) {
        userPromptParts.push(netSection);
        currentTokens += netTokens;
        preservedSections.push('network_failures');
      } else {
        truncated = true;
      }
    }

    // 3. Add Console Errors (High Priority)
    if (context.consoleErrors && context.consoleErrors.length > 0) {
      const consoleSection = [
        `\n### BROWSER CONSOLE ERRORS (${context.consoleErrors.length})`,
        ...context.consoleErrors.slice(0, 5).map((c) => `  - [${c.type.toUpperCase()}] ${c.text}${c.location ? ` (at ${c.location})` : ''}`),
      ].join('\n');

      const consoleTokens = this.estimateTokens(consoleSection);
      if (currentTokens + consoleTokens <= maxTokenBudget) {
        userPromptParts.push(consoleSection);
        currentTokens += consoleTokens;
        preservedSections.push('console_errors');
      } else {
        truncated = true;
      }
    }

    // 4. Add Relevant Source Snippets (AST Grounding)
    if (context.sourceSnippets && context.sourceSnippets.length > 0) {
      const snippetParts: string[] = [`\n### RELEVANT SOURCE CODE CONTEXT`];
      for (const snippet of context.sourceSnippets.slice(0, 3)) {
        const item = `File: ${snippet.filePath} (lines ${snippet.startLine}-${snippet.endLine})\n\`\`\`tsx\n${snippet.content.slice(0, 800)}\n\`\`\``;
        const itemTokens = this.estimateTokens(item);
        if (currentTokens + itemTokens <= maxTokenBudget) {
          snippetParts.push(item);
          currentTokens += itemTokens;
          preservedSections.push(`snippet:${snippet.filePath}`);
        } else {
          truncated = true;
          break;
        }
      }
      if (snippetParts.length > 1) {
        userPromptParts.push(snippetParts.join('\n'));
      }
    }

    userPromptParts.push('\nOutput the root cause diagnosis and patch preview in strictly valid JSON format:');

    const userPrompt = userPromptParts.join('\n');
    const totalTokens = this.estimateTokens(systemPrompt) + this.estimateTokens(userPrompt);

    return {
      systemPrompt,
      userPrompt,
      estimatedTokens: totalTokens,
      truncated,
      preservedSections,
    };
  }
}
