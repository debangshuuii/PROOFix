/**
 * Sandbox Lifecycle & Pool Management API Route (Contribution 158)
 *
 * GET /api/v1/sandbox - Lists active sandboxes and warm pool metrics.
 * POST /api/v1/sandbox - Provisions, executes, or destroys sandboxes.
 */

import { NextResponse } from 'next/server';
import { globalSandboxOrchestrator } from '@/lib/sandbox/sandbox-pool';

export async function GET() {
  try {
    const sandboxes = globalSandboxOrchestrator.listSandboxes();
    const stats = globalSandboxOrchestrator.getPoolStats();

    return NextResponse.json({
      success: true,
      stats,
      sandboxes,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, tenantId = 'default', runId = 'manual', mode, sandboxId, command, args, customEnv } = body;

    switch (action) {
      case 'prewarm': {
        await globalSandboxOrchestrator.preWarmPool(body.count || 2, mode);
        return NextResponse.json({
          success: true,
          message: 'Warm pool replenished',
          stats: globalSandboxOrchestrator.getPoolStats(),
        });
      }

      case 'provision': {
        const instance = await globalSandboxOrchestrator.acquireSandbox(
          tenantId,
          runId,
          mode,
          body.policyOverride
        );
        return NextResponse.json({
          success: true,
          sandbox: instance,
        });
      }

      case 'execute': {
        if (!sandboxId || !command) {
          return NextResponse.json(
            { success: false, error: 'Missing sandboxId or command' },
            { status: 400 }
          );
        }
        const result = await globalSandboxOrchestrator.executeInSandbox(
          sandboxId,
          command,
          args,
          customEnv
        );
        return NextResponse.json({
          success: true,
          result,
        });
      }

      case 'destroy': {
        if (!sandboxId) {
          return NextResponse.json(
            { success: false, error: 'Missing sandboxId' },
            { status: 400 }
          );
        }
        const destroyed = await globalSandboxOrchestrator.destroySandbox(sandboxId);
        return NextResponse.json({
          success: true,
          destroyed,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
