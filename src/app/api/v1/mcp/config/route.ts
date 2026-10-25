import { NextResponse } from 'next/server';
import { ClaudeDesktopConfigGenerator } from '@/lib/mcp/config-generator';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'claude';

  if (format === 'cursor') {
    return NextResponse.json({
      cursor: JSON.parse(ClaudeDesktopConfigGenerator.generateCursorSnippet())
    });
  }

  const config = ClaudeDesktopConfigGenerator.generate();
  return NextResponse.json(config);
}
