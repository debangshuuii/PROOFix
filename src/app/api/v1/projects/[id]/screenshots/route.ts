import { NextRequest, NextResponse } from 'next/server';
import {
  queryScreenshots,
  registerScreenshot,
  indexExistingArtifacts,
} from '@/lib/comparison/screenshot-indexer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);

    const runId = searchParams.get('runId') || undefined;
    const route = searchParams.get('route') || undefined;
    const browser = searchParams.get('browser') || undefined;
    const testName = searchParams.get('testName') || undefined;
    const category = searchParams.get('category') || undefined;
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!, 10) : undefined;
    const height = searchParams.get('height') ? parseInt(searchParams.get('height')!, 10) : undefined;

    // Trigger auto-index of existing artifacts if requested or if index is empty
    if (searchParams.get('refresh') === 'true') {
      await indexExistingArtifacts({ projectId });
    }

    const viewport = width && height ? { width, height } : undefined;

    const screenshots = await queryScreenshots({
      projectId,
      runId,
      route,
      browser,
      viewport,
      testName,
      category,
    });

    return NextResponse.json({
      projectId,
      count: screenshots.length,
      screenshots,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    if (body.action === 'index_existing') {
      const indexed = await indexExistingArtifacts({ projectId });
      return NextResponse.json({
        success: true,
        message: `Indexed ${indexed.length} screenshot artifacts.`,
        indexed,
      });
    }

    const metadata = {
      ...body,
      projectId,
    };

    const registered = await registerScreenshot(metadata);
    return NextResponse.json({ success: true, screenshot: registered }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
