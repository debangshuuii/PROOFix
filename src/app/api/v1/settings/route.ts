import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.getSettings();

    // Redact keys in client response
    const maskedSettings = {
      ...settings,
      geminiApiKey: settings.geminiApiKey ? maskKey(settings.geminiApiKey) : '',
      openaiApiKey: settings.openaiApiKey ? maskKey(settings.openaiApiKey) : '',
      anthropicApiKey: settings.anthropicApiKey ? maskKey(settings.anthropicApiKey) : '',
      githubToken: settings.githubToken ? maskKey(settings.githubToken) : '',
    };

    return NextResponse.json({ settings: maskedSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await db.getSettings();

    // Only update keys if non-empty string provided and not masked
    const updates: any = { ...body };
    if (updates.geminiApiKey && updates.geminiApiKey.includes('••••')) delete updates.geminiApiKey;
    if (updates.openaiApiKey && updates.openaiApiKey.includes('••••')) delete updates.openaiApiKey;
    if (updates.anthropicApiKey && updates.anthropicApiKey.includes('••••')) delete updates.anthropicApiKey;
    if (updates.githubToken && updates.githubToken.includes('••••')) delete updates.githubToken;

    const saved = await db.updateSettings(updates);
    return NextResponse.json({
      success: true,
      settings: {
        ...saved,
        geminiApiKey: saved.geminiApiKey ? maskKey(saved.geminiApiKey) : '',
        openaiApiKey: saved.openaiApiKey ? maskKey(saved.openaiApiKey) : '',
        anthropicApiKey: saved.anthropicApiKey ? maskKey(saved.anthropicApiKey) : '',
        githubToken: saved.githubToken ? maskKey(saved.githubToken) : '',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
