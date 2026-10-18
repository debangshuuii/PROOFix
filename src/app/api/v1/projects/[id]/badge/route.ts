import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);

    if (!project) {
      return new NextResponse(generateSvgBadge('PROOFix', 'not found', '#64748b'), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const runs = await db.getRuns(id);
    const latestRun = runs[0];

    if (!latestRun) {
      return new NextResponse(generateSvgBadge('PROOFix', 'no runs', '#64748b'), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    let statusText = 'verified';
    let statusColor = '#10b981'; // green

    if (latestRun.status === 'failed' || (latestRun.summary && latestRun.summary.failed > 0)) {
      const failCount = latestRun.summary?.failed || 1;
      statusText = `${failCount} failing`;
      statusColor = '#f43f5e'; // rose red
    } else if (latestRun.status === 'pending' || latestRun.status === 'testing' || latestRun.status === 'starting') {
      statusText = 'running...';
      statusColor = '#0ea5e9'; // sky blue
    } else if (latestRun.summary && latestRun.summary.total > 0) {
      const passRate = Math.round((latestRun.summary.passed / latestRun.summary.total) * 100);
      statusText = `${passRate}% verified`;
    }

    const svg = generateSvgBadge('PROOFix', statusText, statusColor);

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new NextResponse(generateSvgBadge('PROOFix', 'error', '#ef4444'), {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}

function generateSvgBadge(label: string, value: string, color: string): string {
  const labelWidth = label.length * 7 + 14;
  const valueWidth = value.length * 7 + 14;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#0f172a"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}
