import { NextRequest, NextResponse } from 'next/server';
import { PlaygroundEngine } from '@/lib/playground/playground-engine';
import { ScenarioRegistry } from '@/lib/playground/registry';
import type { DemoScenarioId } from '@/lib/playground/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarioId = body.scenarioId as DemoScenarioId;

    if (!scenarioId || !ScenarioRegistry.hasScenario(scenarioId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid or missing scenarioId. Valid values: ${ScenarioRegistry.getScenarioIds().join(', ')}`,
        },
        { status: 400 }
      );
    }

    const options = {
      mockMode: body.mockMode ?? true,
      autoApplyFix: body.autoApplyFix ?? false,
      telemetryDelayMs: body.telemetryDelayMs ?? 600,
    };

    const result = await PlaygroundEngine.launchDemoRun(scenarioId, options);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to launch demo run' },
      { status: 500 }
    );
  }
}
