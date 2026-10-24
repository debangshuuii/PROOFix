/**
 * PROOFix CLI Doctor: AI Provider API Key Check
 * Checks presence of GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY with heuristic fallback.
 */

import type { DoctorCheckResult } from '../types.ts';

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function checkAiProviderKeys(envMock?: Record<string, string | undefined>): DoctorCheckResult {
  const env = envMock ?? process.env;

  const found: Array<{ name: string; key: string }> = [];

  if (env.GEMINI_API_KEY) {
    found.push({ name: 'Google Gemini', key: maskApiKey(env.GEMINI_API_KEY) });
  }
  if (env.OPENAI_API_KEY) {
    found.push({ name: 'OpenAI', key: maskApiKey(env.OPENAI_API_KEY) });
  }
  if (env.ANTHROPIC_API_KEY) {
    found.push({ name: 'Anthropic Claude', key: maskApiKey(env.ANTHROPIC_API_KEY) });
  }

  if (found.length > 0) {
    const summary = found.map((p) => `${p.name} (${p.key})`).join(', ');
    return {
      id: 'ai_provider_keys',
      name: 'AI Provider API Keys',
      category: 'ai',
      status: 'passed',
      message: `Active AI Provider key(s) detected: ${summary}`,
      details: { configuredProviders: found.map((p) => p.name) },
    };
  }

  return {
    id: 'ai_provider_keys',
    name: 'AI Provider API Keys',
    category: 'ai',
    status: 'warning',
    message: 'No external AI provider keys detected (GEMINI_API_KEY or OPENAI_API_KEY).',
    recommendation: 'Autonomous repair will operate in deterministic heuristic fallback mode. Set GEMINI_API_KEY in .env.local for full multimodal repair.',
    details: { fallbackMode: 'deterministic_heuristic' },
  };
}
