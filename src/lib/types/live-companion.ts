/**
 * Type definitions for Real-Time Interactive Companion & Live Browser Mirroring
 * Feature: Contributions 121–130 (Point 3)
 */

export type CompanionExecutionState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'breakpoint_hit'
  | 'stepping'
  | 'completed'
  | 'failed'
  | 'aborted';

export type CompanionControlAction =
  | 'pause'
  | 'resume'
  | 'step_next'
  | 'restart'
  | 'set_breakpoint'
  | 'clear_breakpoint';

export type CompanionTelemetryEventType =
  | 'state_change'
  | 'step_start'
  | 'step_finish'
  | 'console_log'
  | 'network_request'
  | 'dom_mutation'
  | 'viewport_frame'
  | 'heartbeat';

export interface CompanionTelemetryEvent {
  id: string;
  runId: string;
  type: CompanionTelemetryEventType;
  timestamp: string;
  payload: Record<string, any>;
}

export interface CompanionBreakpoint {
  id: string;
  stepIndex?: number;
  actionType?: string;
  condition?: 'on_failure' | 'always' | 'url_match';
  targetPattern?: string;
  enabled: boolean;
}

export interface ViewportFramePayload {
  frameIndex: number;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: string;
  isKeyframe: boolean;
}

export interface DomMutationRecord {
  type: 'attributes' | 'childList' | 'characterData';
  targetSelector: string;
  attributeName?: string;
  oldValue?: string;
  newValue?: string;
  addedNodesCount?: number;
  removedNodesCount?: number;
  timestamp: string;
}

export interface CompanionSession {
  id: string;
  runId: string;
  state: CompanionExecutionState;
  currentStepIndex: number;
  totalSteps: number;
  breakpoints: CompanionBreakpoint[];
  fps: number;
  connectedClients: number;
  startedAt: string;
  updatedAt: string;
}
