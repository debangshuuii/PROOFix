/**
 * Interactive UI Element Testing & Event Dispatch Schemas
 * Models DOM interactive elements, destructive action boundaries,
 * React hydration checks, and state mutation verification.
 */

export type InteractiveElementType =
  | 'button'
  | 'text_input'
  | 'checkbox'
  | 'select'
  | 'link'
  | 'toggle'
  | 'modal_trigger';

export type InteractionSafetyTier = 'safe_read_only' | 'simulated_input' | 'destructive_blocked';

export interface InteractiveElementDescriptor {
  id?: string;
  tagName: string;
  type?: string;
  selector: string;
  text: string;
  ariaLabel?: string;
  role?: string;
  safetyTier: InteractionSafetyTier;
  isDestructive: boolean;
  destructiveKeyword?: string;
}

export interface UiInteractionRecord {
  element: InteractiveElementDescriptor;
  action: 'click' | 'fill' | 'check' | 'hover';
  inputPayload?: string;
  durationMs: number;
  domMutated: boolean;
  reactStateDispatched: boolean;
  uncaughtException: boolean;
  errorMessage?: string;
}

export interface UiHydrationAuditSummary {
  elementsScanned: number;
  safeInteractionsExecuted: number;
  destructiveActionsBlocked: number;
  hydrationVerified: boolean;
  interactions: UiInteractionRecord[];
}
