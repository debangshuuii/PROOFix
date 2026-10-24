import { ScenarioRegistry } from '../../../../../../lib/playground/registry.ts';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scenario = ScenarioRegistry.getScenarioById(id);

    if (!scenario) {
      return Response.json(
        { success: false, error: `Demo scenario not found: ${id}` },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      scenario,
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message || 'Failed to retrieve scenario' },
      { status: 500 }
    );
  }
}
