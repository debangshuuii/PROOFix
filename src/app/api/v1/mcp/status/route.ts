import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    version: '0.1.0',
    protocolVersion: '2024-11-05',
    transport: 'stdio',
    toolsCount: 7,
    resourcesCount: 2,
    promptsCount: 2,
    timestamp: new Date().toISOString(),
  });
}
