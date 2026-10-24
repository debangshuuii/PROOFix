import { NextRequest, NextResponse } from 'next/server';
import { ScenarioRegistry } from '@/lib/playground/registry';
import { DemoScenarioCategory } from '@/lib/playground/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as DemoScenarioCategory | 'all' | null;
    const query = searchParams.get('q') || undefined;

    const scenarios = ScenarioRegistry.listScenarios(category || 'all', query);

    return NextResponse.json({
      success: true,
      count: scenarios.length,
      scenarios,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list scenarios' },
      { status: 500 }
    );
  }
}
