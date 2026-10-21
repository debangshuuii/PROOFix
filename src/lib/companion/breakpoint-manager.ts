import type { CompanionBreakpoint } from '../types/live-companion.ts';

export interface BreakpointEvaluationContext {
  stepIndex: number;
  actionType: string;
  currentUrl?: string;
  errorOccurred?: boolean;
  errorMessage?: string;
}

export interface BreakpointEvaluationResult {
  shouldPause: boolean;
  matchedBreakpoint?: CompanionBreakpoint;
  reason?: string;
}

export class BreakpointManager {
  private breakpoints: Map<string, CompanionBreakpoint> = new Map();

  /**
   * Registers a new breakpoint.
   */
  public addBreakpoint(bp: Omit<CompanionBreakpoint, 'id'> & { id?: string }): CompanionBreakpoint {
    const id = bp.id || `bp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullBp: CompanionBreakpoint = {
      ...bp,
      id,
      enabled: bp.enabled ?? true,
    };
    this.breakpoints.set(id, fullBp);
    return fullBp;
  }

  /**
   * Removes a breakpoint by ID.
   */
  public removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  /**
   * Toggles breakpoint enabled state.
   */
  public toggleBreakpoint(id: string, enabled?: boolean): boolean {
    const bp = this.breakpoints.get(id);
    if (!bp) return false;
    bp.enabled = enabled !== undefined ? enabled : !bp.enabled;
    return bp.enabled;
  }

  /**
   * Returns all active/registered breakpoints.
   */
  public getBreakpoints(): CompanionBreakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Clears all breakpoints.
   */
  public clear(): void {
    this.breakpoints.clear();
  }

  /**
   * Evaluates if current step execution should trigger a breakpoint pause.
   */
  public evaluate(context: BreakpointEvaluationContext): BreakpointEvaluationResult {
    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue;

      // 1. Condition: on_failure
      if (bp.condition === 'on_failure' && context.errorOccurred) {
        return {
          shouldPause: true,
          matchedBreakpoint: bp,
          reason: `Paused on test step failure: ${context.errorMessage || 'Step failed'}`,
        };
      }

      // 2. Step Index match
      if (typeof bp.stepIndex === 'number' && bp.stepIndex === context.stepIndex) {
        if (bp.condition === 'always' || !bp.condition) {
          return {
            shouldPause: true,
            matchedBreakpoint: bp,
            reason: `Hit breakpoint at step #${context.stepIndex} (${context.actionType})`,
          };
        }
      }

      // 3. Action type match
      if (bp.actionType && bp.actionType.toLowerCase() === context.actionType.toLowerCase()) {
        if (bp.condition === 'always' || !bp.condition) {
          return {
            shouldPause: true,
            matchedBreakpoint: bp,
            reason: `Hit action breakpoint on "${context.actionType}" at step #${context.stepIndex}`,
          };
        }
      }

      // 4. URL Pattern match
      if (bp.condition === 'url_match' && bp.targetPattern && context.currentUrl) {
        try {
          const regex = new RegExp(bp.targetPattern, 'i');
          if (regex.test(context.currentUrl)) {
            return {
              shouldPause: true,
              matchedBreakpoint: bp,
              reason: `Hit URL breakpoint matching pattern "${bp.targetPattern}" (current URL: ${context.currentUrl})`,
            };
          }
        } catch {
          // Fallback to substring match if not valid regex
          if (context.currentUrl.toLowerCase().includes(bp.targetPattern.toLowerCase())) {
            return {
              shouldPause: true,
              matchedBreakpoint: bp,
              reason: `Hit URL breakpoint containing "${bp.targetPattern}"`,
            };
          }
        }
      }
    }

    return { shouldPause: false };
  }
}
