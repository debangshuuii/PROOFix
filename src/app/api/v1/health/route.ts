import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    product: 'PROOFix',
    tagline: "Don't just generate code. Prove that it works.",
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      browserTesting: 'Playwright (Chromium)',
      executionIsolation: 'local_process_sandbox',
      aiProviders: ['gemini', 'openai', 'anthropic', 'deterministic_offline_rule_engine'],
    },
  });
}
