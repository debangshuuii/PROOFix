import { NextRequest, NextResponse } from 'next/server';
import { PlaygroundEngine } from '@/lib/playground/playground-engine';
import { ScenarioRegistry } from '@/lib/playground/registry';
import type { DemoScenarioId } from '@/lib/playground/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarioId = body.scenarioId as DemoScenarioId;
    const runId = body.runId as string;

    if (!scenarioId || !ScenarioRegistry.hasScenario(scenarioId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or missing scenarioId. Valid values: ${ScenarioRegistry.getScenarioIds().join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Missing required runId parameter' },
        { status: 400 }
      );
    }

    const result = await PlaygroundEngine.applyDemoFix(scenarioId, runId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply demo fix' },
      { status: 500 }
    );
  }
}
