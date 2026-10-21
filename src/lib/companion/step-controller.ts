import type {
  CompanionExecutionState,
  CompanionControlAction,
} from '../types/live-companion.ts';
import { BreakpointManager, type BreakpointEvaluationContext } from './breakpoint-manager.ts';
import { globalTelemetryBroadcaster, TelemetryBroadcaster } from './telemetry-broadcaster.ts';

export interface StepControllerOptions {
  runId: string;
  totalSteps?: number;
  breakpointManager?: BreakpointManager;
  broadcaster?: TelemetryBroadcaster;
  maxPauseTimeoutMs?: number;
}

export class StepController {
  private runId: string;
  private state: CompanionExecutionState = 'running';
  private currentStepIndex: number = 0;
  private totalSteps: number;
  private breakpointManager: BreakpointManager;
  private broadcaster: TelemetryBroadcaster;
  private maxPauseTimeoutMs: number;

  private resumeBarrier: {
    promise: Promise<void>;
    resolve: () => void;
  } | null = null;
  private pauseTimer: NodeJS.Timeout | null = null;

  constructor(options: StepControllerOptions) {
    this.runId = options.runId;
    this.totalSteps = options.totalSteps ?? 0;
    this.breakpointManager = options.breakpointManager || new BreakpointManager();
    this.broadcaster = options.broadcaster || globalTelemetryBroadcaster;
    this.maxPauseTimeoutMs = options.maxPauseTimeoutMs ?? 600000; // 10 minutes max pause
  }

  public getState(): CompanionExecutionState {
    return this.state;
  }

  public getCurrentStep(): number {
    return this.currentStepIndex;
  }

  public getBreakpointManager(): BreakpointManager {
    return this.breakpointManager;
  }

  /**
   * Pauses test execution at the next available barrier.
   */
  public pause(): void {
    if (this.state === 'completed' || this.state === 'failed' || this.state === 'aborted') {
      return;
    }
    this.state = 'paused';
    this.armBarrier();
    this.broadcaster.broadcast(this.runId, 'state_change', {
      state: 'paused',
      stepIndex: this.currentStepIndex,
      action: 'pause',
    });
  }

  /**
   * Resumes test execution until the next breakpoint or completion.
   */
  public resume(): void {
    if (this.state !== 'paused' && this.state !== 'breakpoint_hit' && this.state !== 'stepping') {
      return;
    }
    this.state = 'running';
    this.clearPauseTimeout();
    this.releaseBarrier();
    this.broadcaster.broadcast(this.runId, 'state_change', {
      state: 'running',
      stepIndex: this.currentStepIndex,
      action: 'resume',
    });
  }

  /**
   * Steps forward exactly one step, then re-arms the pause barrier.
   */
  public stepNext(): void {
    if (this.state !== 'paused' && this.state !== 'breakpoint_hit') {
      return;
    }
    this.state = 'stepping';
    this.clearPauseTimeout();
    this.releaseBarrier();
    this.broadcaster.broadcast(this.runId, 'state_change', {
      state: 'stepping',
      stepIndex: this.currentStepIndex,
      action: 'step_next',
    });
  }

  /**
   * Invoked immediately before each test step executes. Blocks if in paused/breakpoint state.
   */
  public async beforeStep(
    stepIndex: number,
    actionType: string,
    context: Partial<BreakpointEvaluationContext> = {}
  ): Promise<void> {
    this.currentStepIndex = stepIndex;

    const evalContext: BreakpointEvaluationContext = {
      stepIndex,
      actionType,
      currentUrl: context.currentUrl,
      errorOccurred: false,
    };

    const bpResult = this.breakpointManager.evaluate(evalContext);
    if (bpResult.shouldPause) {
      this.state = 'breakpoint_hit';
      this.armBarrier();
      this.broadcaster.broadcast(this.runId, 'state_change', {
        state: 'breakpoint_hit',
        stepIndex,
        actionType,
        reason: bpResult.reason,
        breakpointId: bpResult.matchedBreakpoint?.id,
      });
    }

    // If state is paused, breakpoint_hit, or stepping, block on the barrier
    if (this.state === 'paused' || this.state === 'breakpoint_hit') {
      this.startPauseTimeout();
      await this.awaitBarrier();
    }

    this.broadcaster.broadcast(this.runId, 'step_start', {
      stepIndex,
      actionType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Invoked immediately after a test step finishes. Re-pauses if stepping or on failure.
   */
  public async afterStep(
    stepIndex: number,
    actionType: string,
    result: { success: boolean; error?: string; durationMs?: number }
  ): Promise<void> {
    this.broadcaster.broadcast(this.runId, 'step_finish', {
      stepIndex,
      actionType,
      success: result.success,
      error: result.error,
      durationMs: result.durationMs,
    });

    // Check on_failure breakpoint
    if (!result.success) {
      const evalContext: BreakpointEvaluationContext = {
        stepIndex,
        actionType,
        errorOccurred: true,
        errorMessage: result.error,
      };
      const bpResult = this.breakpointManager.evaluate(evalContext);
      if (bpResult.shouldPause) {
        this.state = 'breakpoint_hit';
        this.armBarrier();
        this.broadcaster.broadcast(this.runId, 'state_change', {
          state: 'breakpoint_hit',
          stepIndex,
          actionType,
          reason: bpResult.reason,
        });
        this.startPauseTimeout();
        await this.awaitBarrier();
      }
    } else if (this.state === 'stepping') {
      // Re-pause after single step completion
      this.state = 'paused';
      this.armBarrier();
      this.broadcaster.broadcast(this.runId, 'state_change', {
        state: 'paused',
        stepIndex: stepIndex + 1,
        reason: 'Paused after stepping forward 1 step',
      });
    }
  }

  /**
   * Completes the controller session.
   */
  public finish(success: boolean): void {
    this.clearPauseTimeout();
    this.state = success ? 'completed' : 'failed';
    this.releaseBarrier();
    this.broadcaster.broadcast(this.runId, 'state_change', {
      state: this.state,
      stepIndex: this.currentStepIndex,
    });
  }

  private armBarrier(): void {
    if (!this.resumeBarrier) {
      let resolveFn!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve;
      });
      this.resumeBarrier = { promise, resolve: resolveFn };
    }
  }

  private releaseBarrier(): void {
    if (this.resumeBarrier) {
      this.resumeBarrier.resolve();
      this.resumeBarrier = null;
    }
  }

  private async awaitBarrier(): Promise<void> {
    if (this.resumeBarrier) {
      await this.resumeBarrier.promise;
    }
  }

  private startPauseTimeout(): void {
    this.clearPauseTimeout();
    this.pauseTimer = setTimeout(() => {
      this.state = 'aborted';
      this.releaseBarrier();
      this.broadcaster.broadcast(this.runId, 'state_change', {
        state: 'aborted',
        reason: `Maximum pause timeout (${this.maxPauseTimeoutMs / 1000}s) exceeded. Session aborted to free resources.`,
      });
    }, this.maxPauseTimeoutMs);
  }

  private clearPauseTimeout(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }
}
