import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, verifyProjectOwnership } from '@/lib/security/ownership';
import { sendTestNotification } from '@/lib/notifications/test-sender';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const auth = getAuthContext(req);

    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: `Project "${projectId}" not found.` }, { status: 404 });
    }

    const ownership = verifyProjectOwnership(project, auth, 'write');
    if (!ownership.authorized) {
      return NextResponse.json(
        { error: ownership.reason || 'Unauthorized to trigger test notifications for this project.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const channelId = body.channelId;
    if (!channelId || typeof channelId !== 'string') {
      return NextResponse.json({ error: 'channelId is required to test a notification channel.' }, { status: 400 });
    }

    const result = await sendTestNotification(projectId, channelId, auth.userId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
