import { PlaygroundEngine } from '../../../../../lib/playground/playground-engine.ts';
import { ScenarioRegistry } from '../../../../../lib/playground/registry.ts';
import type { DemoScenarioId } from '../../../../../lib/playground/types.ts';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scenarioId = body.scenarioId as DemoScenarioId;
    const runId = body.runId as string;

    if (!scenarioId || !ScenarioRegistry.hasScenario(scenarioId)) {
      return Response.json(
        {
          success: false,
          error: `Invalid or missing scenarioId. Valid values: ${ScenarioRegistry.getScenarioIds().join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!runId) {
      return Response.json(
        { success: false, error: 'Missing required runId parameter' },
        { status: 400 }
      );
    }

    const result = await PlaygroundEngine.applyDemoFix(scenarioId, runId);

    return Response.json(result);
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message || 'Failed to apply demo fix' },
      { status: 500 }
    );
  }
}
