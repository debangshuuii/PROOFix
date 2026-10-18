import { NextRequest } from 'next/server';
import { subscribeToRun } from '@/lib/execution/runner';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = await db.getRunById(id);

  if (!run) {
    return new Response('Run not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial backlog of logs
      for (const log of run.logs) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status: run.status })}\n\n`));

      // Subscribe to live run events
      const unsubscribe = subscribeToRun(id, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat ping every 15 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(interval);
          unsubscribe();
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
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
