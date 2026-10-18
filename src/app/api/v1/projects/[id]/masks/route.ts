import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectMasks,
  saveProjectMasks,
  addProjectMask,
  deleteProjectMask,
} from '@/lib/comparison/mask-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route') || undefined;

    const masks = await getProjectMasks(projectId, route);
    return NextResponse.json({ projectId, count: masks.length, masks });
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

    if (Array.isArray(body.masks)) {
      const saved = await saveProjectMasks(projectId, body.masks);
      return NextResponse.json({ success: true, count: saved.length, masks: saved });
    }

    const added = await addProjectMask(projectId, body);
    return NextResponse.json({ success: true, mask: added }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const maskId = searchParams.get('maskId');

    if (!maskId) {
      return NextResponse.json({ error: 'maskId query parameter is required' }, { status: 400 });
    }

    const deleted = await deleteProjectMask(projectId, maskId);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
