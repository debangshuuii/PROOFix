import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, verifyProjectOwnership } from '@/lib/security/ownership';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const auth = getAuthContext(req);
    const authCheck = verifyProjectOwnership(project, auth, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason }, { status: 403 });
    }

    const versions = await db.getProjectVersions(id);
    const runs = await db.getRuns(id);

    return NextResponse.json({ project, versions, recentRuns: runs.slice(0, 5) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const auth = getAuthContext(req);
    const authCheck = verifyProjectOwnership(project, auth, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason }, { status: 403 });
    }

    const body = await req.json();
    const updated = await db.updateProject(id, body);
    return NextResponse.json({ project: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const auth = getAuthContext(req);
    const authCheck = verifyProjectOwnership(project, auth, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.reason }, { status: 403 });
    }

    const deleted = await db.deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Project could not be deleted' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
