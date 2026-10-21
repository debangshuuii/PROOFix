import { NextRequest, NextResponse } from 'next/server';
import { globalWebhookVerifier } from '@/lib/integrations/webhook-verifier';
import { parseGitHubWebhook } from '@/lib/integrations/github-parser';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    provider: 'github',
    endpoint: '/api/v1/integrations/github/webhook',
    supportedEvents: ['pull_request', 'push', 'check_run'],
    documentation: 'Send GitHub webhooks with X-Hub-Signature-256 HMAC header.',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'proofix_github_webhook_secret_default';

    // Verify HMAC signature
    const verification = globalWebhookVerifier.verifyGitHubSignature(rawBody, signature, secret);
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid HMAC signature', reason: verification.error },
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

    const event = parseGitHubWebhook(headersRecord, payload);
    if (!event) {
      return NextResponse.json(
        {
          status: 'ignored',
          reason: 'Event or action is not subscribed for automated verification',
        },
        { status: 200 }
      );
    }

    // Return accepted and metadata for queue ingestion
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
