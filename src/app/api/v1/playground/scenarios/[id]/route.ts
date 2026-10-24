import { NextRequest, NextResponse } from 'next/server';
import { ScenarioRegistry } from '@/lib/playground/registry';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scenario = ScenarioRegistry.getScenarioById(id);

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: `Demo scenario not found: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      scenario,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve scenario' },
      { status: 500 }
    );
  }
}
