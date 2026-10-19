import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, verifyProjectOwnership } from '@/lib/security/ownership';
import { validateNotificationSettings } from '@/lib/notifications/schema';
import type { ProjectNotificationSettings } from '@/lib/types/notification';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Mask raw secret fields in response so ordinary settings APIs never return secrets.
 */
function sanitizeSettingsForClient(
  settings: ProjectNotificationSettings
): ProjectNotificationSettings {
  return {
    ...settings,
    channels: settings.channels.map((ch) => ({
      ...ch,
      webhookUrlEncrypted: undefined, // Never expose encrypted blob to client
      webhookUrlMasked: ch.webhookUrlMasked || (ch.hasSecret ? '••••••••••••••••' : undefined),
    })),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const auth = getAuthContext(req);

    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: `Project "${projectId}" not found.` }, { status: 404 });
    }

    const ownership = verifyProjectOwnership(project, auth, 'read');
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownership.reason || 'Forbidden' }, { status: 403 });
    }

    const settings = await db.getProjectNotificationSettings(projectId, auth.userId);
    return NextResponse.json(sanitizeSettingsForClient(settings));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const auth = getAuthContext(req);

    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: `Project "${projectId}" not found.` }, { status: 404 });
    }

    // Done when: unauthorized users cannot modify another project's notification settings.
    const ownership = verifyProjectOwnership(project, auth, 'write');
    if (!ownership.authorized) {
      return NextResponse.json(
        { error: ownership.reason || `Unauthorized: User "${auth.userId}" cannot modify project notification settings.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = validateNotificationSettings(body, projectId);
    if (!validation.valid || !validation.settings) {
      return NextResponse.json(
        { error: 'Invalid notification settings.', details: validation.errors },
        { status: 400 }
      );
    }

    // Preserve existing encrypted secrets if not updating the URL
    const existing = await db.getProjectNotificationSettings(projectId, auth.userId);
    const existingChannelMap = new Map(existing.channels.map((c) => [c.id, c]));

    const mergedChannels = validation.settings.channels.map((ch) => {
      const prev = existingChannelMap.get(ch.id);
      if (prev && !ch.webhookUrlEncrypted && prev.webhookUrlEncrypted) {
        return {
          ...ch,
          webhookUrlEncrypted: prev.webhookUrlEncrypted,
          webhookUrlMasked: prev.webhookUrlMasked,
          hasSecret: true,
        };
      }
      return ch;
    });

    validation.settings.channels = mergedChannels;

    const saved = await db.saveProjectNotificationSettings(projectId, validation.settings, auth.userId);
    return NextResponse.json(sanitizeSettingsForClient(saved));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
