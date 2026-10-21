import { NextRequest, NextResponse } from 'next/server';
import { globalWebhookVerifier } from '@/lib/integrations/webhook-verifier';
import { parseGitLabWebhook } from '@/lib/integrations/gitlab-parser';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    provider: 'gitlab',
    endpoint: '/api/v1/integrations/gitlab/webhook',
    supportedEvents: ['Merge Request Hook', 'Push Hook'],
    documentation: 'Send GitLab webhooks with X-Gitlab-Token header.',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const token = req.headers.get('x-gitlab-token');
    const secret = process.env.GITLAB_WEBHOOK_SECRET || 'proofix_gitlab_webhook_secret_default';

    // Verify token
    const verification = globalWebhookVerifier.verifyGitLabToken(token, secret);
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid GitLab secret token', reason: verification.error },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const headersRecord: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => {
      headersRecord[key] = val;
    });

    const event = parseGitLabWebhook(headersRecord, payload);
    if (!event) {
      return NextResponse.json(
        {
          status: 'ignored',
          reason: 'Event or action is not subscribed for automated verification',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'accepted',
        eventId: event.id,
        provider: event.provider,
        eventType: event.eventType,
        commitSha: event.commitSha,
        branch: event.branch,
        pullRequestNumber: event.pullRequestNumber,
        repository: event.repository.fullName,
        timestamp: event.timestamp,
        action: 'verification_queued',
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal server error processing webhook', message: err?.message },
      { status: 500 }
    );
  }
}
