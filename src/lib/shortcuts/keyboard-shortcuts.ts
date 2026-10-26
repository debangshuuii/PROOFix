/**
 * Linear-Grade Global Keyboard Shortcuts Manager
 * Dispatches Cmd+Enter (rerun), Cmd+K (palette), Cmd+D (diff),
 * Space (scrubber play/pause), and ArrowLeft/Right (scrubber step).
 */

export type ShortcutAction =
  | 'rerun_verification'
  | 'toggle_palette'
  | 'toggle_diff'
  | 'toggle_playback'
  | 'step_backward'
  | 'step_forward'
  | 'toggle_audio';

export type ShortcutHandler = (action: ShortcutAction, event: KeyboardEvent) => void;

export class KeyboardShortcutsManager {
  private handlers: Set<ShortcutHandler> = new Set();
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachListener();
    }
  }

  public register(handler: ShortcutHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private attachListener(): void {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs or contenteditables
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // 1. Cmd+Enter / Ctrl+Enter -> Rerun Verification
      if (modifier && e.key === 'Enter') {
        e.preventDefault();
        this.dispatch('rerun_verification', e);
        return;
      }

      // 2. Cmd+D / Ctrl+D -> Toggle Diff Viewer
      if (modifier && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        this.dispatch('toggle_diff', e);
        return;
      }

      // If user is inside an input, do not trigger space or arrow keys
      if (isInput) return;

      // 3. Space -> Play/Pause Scrubber
      if (e.code === 'Space') {
        e.preventDefault();
        this.dispatch('toggle_playback', e);
        return;
      }

      // 4. ArrowLeft -> Step Backward
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.dispatch('step_backward', e);
        return;
      }

      // 5. ArrowRight -> Step Forward
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.dispatch('step_forward', e);
        return;
      }

      // 6. 'm' or 'M' -> Toggle Audio
      if (e.key === 'm' || e.key === 'M') {
        this.dispatch('toggle_audio', e);
        return;
      }
    });

    this.isListening = true;
  }

  private dispatch(action: ShortcutAction, event: KeyboardEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(action, event);
      } catch (err) {
        console.error(`[KeyboardShortcuts] Handler error for ${action}:`, err);
      }
    }
  }
}

export const globalKeyboardShortcuts = new KeyboardShortcutsManager();
