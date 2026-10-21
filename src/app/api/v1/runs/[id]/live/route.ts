import { NextRequest } from 'next/server';
import { globalTelemetryBroadcaster } from '@/lib/companion/telemetry-broadcaster';
import { globalCompanionSessionManager } from '@/lib/companion/companion-session-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Ensure companion session exists
  globalCompanionSessionManager.createSession(id);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to telemetry broadcaster (replays recent history automatically)
      const unsubscribe = globalTelemetryBroadcaster.subscribe(
        id,
        (sseChunk) => {
          try {
            controller.enqueue(encoder.encode(sseChunk));
          } catch {
            unsubscribe();
          }
        },
        true
      );

      // Heartbeat ping every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
