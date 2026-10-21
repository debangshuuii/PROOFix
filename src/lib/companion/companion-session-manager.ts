import type {
  CompanionSession,
  CompanionExecutionState,
  CompanionControlAction,
  CompanionBreakpoint,
} from '../types/live-companion.ts';
import { StepController } from './step-controller.ts';
import { BreakpointManager } from './breakpoint-manager.ts';
import { FrameStreamer, globalFrameStreamer } from './frame-streamer.ts';
import { DomMutationTracker } from './dom-mutation-tracker.ts';
import { TelemetryBroadcaster, globalTelemetryBroadcaster } from './telemetry-broadcaster.ts';

export interface ActiveCompanionContext {
  session: CompanionSession;
  stepController: StepController;
  breakpointManager: BreakpointManager;
  frameStreamer: FrameStreamer;
  domMutationTracker: DomMutationTracker;
}

export class CompanionSessionManager {
  private activeContexts: Map<string, ActiveCompanionContext> = new Map();
  private broadcaster: TelemetryBroadcaster;
  private frameStreamer: FrameStreamer;

  constructor(
    broadcaster: TelemetryBroadcaster = globalTelemetryBroadcaster,
    frameStreamer: FrameStreamer = globalFrameStreamer
  ) {
    this.broadcaster = broadcaster;
    this.frameStreamer = frameStreamer;
  }

  /**
   * Initializes or returns an existing live companion session for a verification run.
   */
  public createSession(runId: string, totalSteps: number = 0, initialFps: number = 12): ActiveCompanionContext {
    if (this.activeContexts.has(runId)) {
      return this.activeContexts.get(runId)!;
    }

    const breakpointManager = new BreakpointManager();
    const stepController = new StepController({
      runId,
      totalSteps,
      breakpointManager,
      broadcaster: this.broadcaster,
    });
    const domMutationTracker = new DomMutationTracker(runId, {}, this.broadcaster);

    const session: CompanionSession = {
      id: `comp_sess_${runId}`,
      runId,
      state: 'running',
      currentStepIndex: 0,
      totalSteps,
      breakpoints: [],
      fps: initialFps,
      connectedClients: this.broadcaster.getSubscriberCount(runId),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: ActiveCompanionContext = {
      session,
      stepController,
      breakpointManager,
      frameStreamer: this.frameStreamer,
      domMutationTracker,
    };

    this.activeContexts.set(runId, context);
    return context;
  }

  /**
   * Retrieves active companion context by run ID.
   */
  public getContext(runId: string): ActiveCompanionContext | undefined {
    return this.activeContexts.get(runId);
  }

  /**
   * Executes a control action (pause, resume, step_next, set_breakpoint).
   */
  public executeAction(
    runId: string,
    action: CompanionControlAction,
    params: Record<string, any> = {}
  ): { success: boolean; state: CompanionExecutionState; error?: string } {
    const ctx = this.activeContexts.get(runId);
    if (!ctx) {
      return { success: false, state: 'idle', error: `No active companion session found for run "${runId}"` };
    }

    ctx.session.updatedAt = new Date().toISOString();

    switch (action) {
      case 'pause':
        ctx.stepController.pause();
        ctx.session.state = ctx.stepController.getState();
        return { success: true, state: ctx.session.state };

      case 'resume':
        ctx.stepController.resume();
        ctx.session.state = ctx.stepController.getState();
        return { success: true, state: ctx.session.state };

      case 'step_next':
        ctx.stepController.stepNext();
        ctx.session.state = ctx.stepController.getState();
        return { success: true, state: ctx.session.state };

      case 'set_breakpoint': {
        const bp = ctx.breakpointManager.addBreakpoint({
          stepIndex: params.stepIndex,
          actionType: params.actionType,
          condition: params.condition || 'always',
          targetPattern: params.targetPattern,
          enabled: true,
        });
        ctx.session.breakpoints = ctx.breakpointManager.getBreakpoints();
        return { success: true, state: ctx.session.state };
      }

      case 'clear_breakpoint': {
        if (params.id) {
          ctx.breakpointManager.removeBreakpoint(params.id);
        } else {
          ctx.breakpointManager.clear();
        }
        ctx.session.breakpoints = ctx.breakpointManager.getBreakpoints();
        return { success: true, state: ctx.session.state };
      }

      default:
        return { success: false, state: ctx.session.state, error: `Unsupported control action "${action}"` };
    }
  }

  /**
   * Terminates and cleans up companion session.
   */
  public terminateSession(runId: string, success: boolean = true): void {
    const ctx = this.activeContexts.get(runId);
    if (ctx) {
      ctx.stepController.finish(success);
      ctx.session.state = success ? 'completed' : 'failed';
      ctx.session.updatedAt = new Date().toISOString();
      this.frameStreamer.clearRun(runId);
      this.activeContexts.delete(runId);
    }
  }

  /**
   * Lists all active session summaries.
   */
  public listActiveSessions(): CompanionSession[] {
    return Array.from(this.activeContexts.values()).map((ctx) => {
      ctx.session.connectedClients = this.broadcaster.getSubscriberCount(ctx.session.runId);
      ctx.session.state = ctx.stepController.getState();
      ctx.session.currentStepIndex = ctx.stepController.getCurrentStep();
      return { ...ctx.session };
    });
  }
}

export const globalCompanionSessionManager = new CompanionSessionManager();
