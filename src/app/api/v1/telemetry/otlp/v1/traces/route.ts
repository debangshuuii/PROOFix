import { NextRequest, NextResponse } from 'next/server';
import { globalSpanBuffer } from '@/lib/telemetry/span-buffer';
import type { OTelSpan, SpanKind, SpanStatusCode } from '@/lib/types/otel-tracing';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const traceId = searchParams.get('traceId');

  if (traceId) {
    const spans = globalSpanBuffer.getSpansForTrace(traceId);
    return NextResponse.json({
      traceId,
      spansCount: spans.length,
      spans,
    });
  }

  // Otherwise return recent buffered spans
  const allSpans = globalSpanBuffer.flush();
  return NextResponse.json({
    status: 'active',
    bufferedSpans: allSpans.length,
    spans: allSpans,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    if (!rawBody || !Array.isArray(rawBody.resourceSpans)) {
      return NextResponse.json(
        { error: 'Invalid OTLP/HTTP payload: missing resourceSpans array' },
        { status: 400 }
      );
    }

    let ingestedCount = 0;

    for (const resSpan of rawBody.resourceSpans) {
      if (!Array.isArray(resSpan.scopeSpans)) continue;

      for (const scopeSpan of resSpan.scopeSpans) {
        if (!Array.isArray(scopeSpan.spans)) continue;

        for (const s of scopeSpan.spans) {
          const attributes: Record<string, string | number | boolean> = {};
          if (Array.isArray(s.attributes)) {
            for (const attr of s.attributes) {
              if (attr.value) {
                attributes[attr.key] =
                  attr.value.stringValue ??
                  attr.value.intValue ??
                  attr.value.boolValue ??
                  String(attr.value);
              }
            }
          }

          const kindMap: Record<number, SpanKind> = {
            1: 'INTERNAL',
            2: 'SERVER',
            3: 'CLIENT',
            4: 'PRODUCER',
            5: 'CONSUMER',
          };

          const statusMap: Record<number, SpanStatusCode> = {
            0: 'UNSET',
            1: 'OK',
            2: 'ERROR',
          };

          const startNano = BigInt(s.startTimeUnixNano || '0');
          const endNano = BigInt(s.endTimeUnixNano || s.startTimeUnixNano || '0');
          const durationMs = Math.max(0.01, +(Number(endNano - startNano) / 1_000_000).toFixed(2));

          const convertedSpan: OTelSpan = {
            traceId: s.traceId,
            spanId: s.spanId,
            parentSpanId: s.parentSpanId,
            name: s.name,
            kind: kindMap[s.kind] || 'INTERNAL',
            startTimeNano: startNano,
            endTimeNano: endNano,
            durationMs,
            attributes,
            events: Array.isArray(s.events)
              ? s.events.map((e: any) => ({
                  name: e.name,
                  timestampNano: BigInt(e.timeUnixNano || '0'),
                  attributes: e.attributes
                    ? e.attributes.reduce((acc: any, curr: any) => {
                        acc[curr.key] =
                          curr.value?.stringValue ??
                          curr.value?.intValue ??
                          curr.value?.boolValue ??
                          '';
                        return acc;
                      }, {})
                    : undefined,
                }))
              : [],
            status: {
              code: statusMap[s.status?.code] || 'OK',
              description: s.status?.message,
            },
          };

          globalSpanBuffer.recordSpan(convertedSpan);
          ingestedCount++;
        }
      }
    }

    return NextResponse.json(
      {
        partialSuccess: {},
        ingestedSpans: ingestedCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal error processing OTLP trace batch', message: err?.message },
      { status: 500 }
    );
  }
}
