import { ScenarioRegistry } from '../../../../../lib/playground/registry.ts';
import type { DemoScenarioCategory } from '../../../../../lib/playground/types.ts';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as DemoScenarioCategory | 'all' | null;
    const query = searchParams.get('q') || undefined;

    const scenarios = ScenarioRegistry.listScenarios(category || 'all', query);

    return Response.json({
      success: true,
      count: scenarios.length,
      scenarios,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message || 'Failed to list scenarios' },
      { status: 500 }
    );
  }
}
