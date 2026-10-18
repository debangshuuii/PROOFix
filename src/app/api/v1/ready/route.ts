import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const projects = await db.getProjects();
    return NextResponse.json({
      status: 'ready',
      storage: 'connected',
      projectCount: projects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unready',
        error: err.message,
      },
      { status: 503 }
    );
  }
}
