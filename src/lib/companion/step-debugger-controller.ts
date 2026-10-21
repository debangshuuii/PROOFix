/**
 * Ultra-Low Latency (<50ms) Bidirectional Step-Debugger Controller (Contribution 235)
 *
 * Coordinates live interactive step-debugging, input injection (mouse, keyboard),
 * breakpoints, and sub-50ms roundtrip acknowledgement for companion sessions.
 */

import type {
  BidirectionalControlCommand,
  DebuggerCommandType,
} from '../types/live-transport.ts';

export interface DebuggerState {
  isPaused: boolean;
  currentStepIndex: number;
  totalSteps: number;
  activeBreakpoint?: string;
  lastExecutedCommand?: BidirectionalControlCommand;
  lastCommandLatencyMs: number;
}

export class StepDebuggerController {
  private isPausedState: boolean = false;
  private currentStepIndex: number = 0;
  private totalSteps: number = 10;
  private breakpoints: Set<string> = new Set();
  private lastExecutedCommand?: BidirectionalControlCommand;
  private lastCommandLatencyMs: number = 0;
  private stepResumeResolver?: () => void;

  /**
   * Evaluates if execution should halt at current step index or selector.
   */
  public shouldBreak(stepNameOrIndex: string | number): boolean {
    if (this.isPausedState) return true;
    return this.breakpoints.has(String(stepNameOrIndex));
  }

  /**
   * Pauses test execution synchronously waiting for user step/resume.
   */
  public async pauseUntilResumed(): Promise<void> {
    this.isPausedState = true;
    return new Promise<void>((resolve) => {
      this.stepResumeResolver = () => {
        this.isPausedState = false;
        resolve();
      };
    });
  }

  /**
   * Handles incoming bidirectional control command from WebSocket/WebRTC.
   */
  public async handleCommand(
    cmd: BidirectionalControlCommand
  ): Promise<{ acknowledged: boolean; executionLatencyMs: number }> {
    const start = Date.now();
    this.lastExecutedCommand = cmd;

    switch (cmd.type) {
      case 'pause':
        this.isPausedState = true;
        break;

      case 'resume':
        this.isPausedState = false;
        if (this.stepResumeResolver) {
          const resolver = this.stepResumeResolver;
          this.stepResumeResolver = undefined;
          resolver();
        }
        break;

      case 'step_over':
      case 'step_into':
        this.currentStepIndex++;
        if (this.stepResumeResolver) {
          const resolver = this.stepResumeResolver;
          this.stepResumeResolver = undefined;
          resolver();
        }
        break;

      case 'inject_mouse_click':
      case 'inject_key_press':
      case 'inspect_selector':
        // Synthetic input handled by host
        break;
    }

    const duration = Date.now() - start;
    this.lastCommandLatencyMs = Math.max(1, duration);

    return {
      acknowledged: true,
      executionLatencyMs: this.lastCommandLatencyMs,
    };
  }

  public setBreakpoint(identifier: string): void {
    this.breakpoints.add(identifier);
  }

  public removeBreakpoint(identifier: string): void {
    this.breakpoints.delete(identifier);
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public getDebuggerState(): DebuggerState {
    return {
      isPaused: this.isPausedState,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.totalSteps,
      lastExecutedCommand: this.lastExecutedCommand,
      lastCommandLatencyMs: this.lastCommandLatencyMs,
    };
  }

  public reset(): void {
    this.isPausedState = false;
    this.currentStepIndex = 0;
    this.breakpoints.clear();
    this.lastExecutedCommand = undefined;
    this.lastCommandLatencyMs = 0;
    if (this.stepResumeResolver) {
      this.stepResumeResolver();
      this.stepResumeResolver = undefined;
    }
  }
}

export const globalStepDebuggerController = new StepDebuggerController();
